Ext.ns('Jarvus.mobile');

Jarvus.mobile.PinchCarousel = Ext.extend(Ext.Carousel, {

	imageField: 'image_url'
	//,captionField: 'caption' // NOT YET IMPLEMENTED
	,store: false
	,images: false
	,doubleTapScale: 1

	,initComponent: function() {
	
		this.items = this.items || [];
	
		if(this.store)
		{
			// initialize items from a store if provided
			this.store.each(this.addImage, this);
		}
		else if(this.images)
		{
			// initialize items from an array of URLs
			Ext.each(this.images, this.addImage, this);
		}
		
		Jarvus.mobile.PinchCarousel.superclass.initComponent.apply(this, arguments);
		
		
	}

	,afterRender: function() {
		Jarvus.mobile.PinchCarousel.superclass.afterRender.call(this);
	
		if(this.doubleTapScale)
		{
			this.mon(this.body, 'doubletap', this.onDoubleTap, this, {delegate: 'img'});
		}
	}

	,addImage: function(image) {
	
		image = (typeof image == "string") ? image : image.get(this.imageField);
	
		var slideCfg = {
			xtype: 'component'
			,cls: 'imageBox'
			,scroll: 'both'
			,html: [
				'<figure>'
					,Ext.LoadingSpinner
					,'<img src="'+image+'">'
				,'</figure>'
			]
			,listeners: {
				scope: this
				,afterrender: this.onAfterImageBoxRender
			}
		};
	
		if(this.rendered)
		{
			this.add(slideCfg);
			this.doLayout();
		}
		else
		{
			this.items.push(slideCfg);
		}
	}	

	
	,onAfterImageBoxRender: function(imgBox) {
	
		// get viewport size
		this.viewportWidth = this.viewportWidth || this.getWidth();
		this.viewportHeight = this.viewportHeight || this.getHeight();
		
		// retrieve DOM els
		imgBox.figEl = imgBox.el.down('figure');
		imgBox.imgEl = imgBox.figEl.down('img');
		
		// apply required styles
		imgBox.figEl.setStyle({
			overflow: 'hidden'
			,display: 'block'
			,margin: 0
		});
		
		imgBox.imgEl.setStyle({
			'-webkit-user-drag': 'none'
			,'-webkit-transform-origin': '0 0'
			,'visibility': 'hidden'
		});

	
		this.mon(imgBox.imgEl, 'load', function() {
		
			imgBox.imgWidth = imgBox.imgEl.dom.width
			imgBox.imgHeight = imgBox.imgEl.dom.height;
			
			// calculate and apply initial scale to fit image to screen
			if(imgBox.imgWidth > this.viewportWidth || imgBox.imgHeight > this.viewportHeight)
				imgBox.scale = imgBox.baseScale = Math.min(this.viewportWidth/imgBox.imgWidth, this.viewportHeight/imgBox.imgHeight);
			else
				imgBox.scale = imgBox.baseScale = 1;
			
			// set initial translation to center
			imgBox.translateX = imgBox.translateBaseX = (this.viewportWidth - imgBox.baseScale * imgBox.imgWidth) / 2;
			imgBox.translateY = imgBox.translateBaseY = (this.viewportHeight - imgBox.baseScale * imgBox.imgHeight) / 2;
			
			this.applyTransform(imgBox);
			

			// remove spinner and show image
			imgBox.el.down('.x-loading-spinner').remove();
			imgBox.imgEl.setStyle({ visibility: 'visible' });
			
			// initialize scroller configuration
			this.adjustScroller(imgBox);

			// wire pinch listeners
			imgBox.imgEl.on({
				scope: this
				,pinchstart: function(ev, t) {
				
					// disable scrolling during pinch
					imgBox.scroller.stopMomentumAnimation();
					imgBox.scroller.disable();
					
					// store beginning scale
					imgBox.startScale = imgBox.scale;
					
					// calculate touch midpoint relative to image viewport
					imgBox.originViewportX = (ev.touches[0].clientX + ev.touches[1].clientX) / 2 - imgBox.el.getX();
					imgBox.originViewportY = (ev.touches[0].clientY + ev.touches[1].clientY) / 2 - imgBox.el.getY();
					
					// translate viewport origin to position on scaled image
					imgBox.originScaledImgX = imgBox.originViewportX - imgBox.scroller.offset.x - imgBox.translateX;
					imgBox.originScaledImgY = imgBox.originViewportY - imgBox.scroller.offset.y - imgBox.translateY;
					
					// unscale to find origin on full size image
					imgBox.originFullImgX = imgBox.originScaledImgX / imgBox.scale;
					imgBox.originFullImgY = imgBox.originScaledImgY / imgBox.scale;
					
					// calculate translation needed to counteract new origin and keep image in same position on screen
					imgBox.translateX += (-1 * ((imgBox.imgWidth*(1-imgBox.scale)) * (imgBox.originFullImgX/imgBox.imgWidth)));
					imgBox.translateY += (-1 * ((imgBox.imgHeight*(1-imgBox.scale)) * (imgBox.originFullImgY/imgBox.imgHeight)))

					// apply new origin
					imgBox.imgEl.dom.style.webkitTransformOrigin = (imgBox.originFullImgX)+'px '+(imgBox.originFullImgY)+'px';

					// apply translate and scale CSS
					this.applyTransform(imgBox);
					
					
				}
				,pinch: function(ev, t) {
					// prevent scaling to smaller than screen size
					imgBox.scale = Ext.util.Numbers.constrain(ev.scale * imgBox.startScale, imgBox.baseScale);
					this.applyTransform(imgBox);
				}
				,pinchend: function(ev, t) {
				
					// calculate rescaled origin
					imgBox.originReScaledImgX = imgBox.originScaledImgX * (imgBox.scale / imgBox.startScale);
					imgBox.originReScaledImgY = imgBox.originScaledImgY * (imgBox.scale / imgBox.startScale);
				
					// calculate new translation
					imgBox.translateX = imgBox.originViewportX - imgBox.originReScaledImgX;
					imgBox.translateY = imgBox.originViewportY - imgBox.originReScaledImgY;
						
					// transfer negative translations to scroll offset
					imgBox.scrollX = imgBox.scrollY = 0;
					
					if(imgBox.translateX < 0)
					{
						imgBox.scrollX = imgBox.translateX;
						imgBox.translateX = 0;
					}
					if(imgBox.translateY < 0)
					{
						imgBox.scrollY = imgBox.translateY;
						imgBox.translateY = 0;
					}
						
					
					// reset origin and update transform with new translation
					imgBox.imgEl.dom.style.webkitTransformOrigin = '0 0';
					this.applyTransform(imgBox);
		
					// adjust scroll container
					this.adjustScroller(imgBox);
					
					// apply scroll
					imgBox.scroller.setOffset({
						x: imgBox.scrollX
						,y: imgBox.scrollY
					});
					
				}
			});
		}, this);
		
	}
	
	
	,onDoubleTap: function(ev, t) {
		
		var imgBox = Ext.getCmp(ev.getTarget('.imageBox').id)
			,oldScale = imgBox.scale
			,newScale = oldScale + this.doubleTapScale
			,originViewportX = ev.pageX - imgBox.el.getX()
			,originViewportY = ev.pageY - imgBox.el.getY()
			,originScaledImgX = originViewportX - imgBox.scroller.offset.x - imgBox.translateX
			,originScaledImgY = originViewportY - imgBox.scroller.offset.y - imgBox.translateY
			,originReScaledImgX = originScaledImgX * (newScale / oldScale)
			,originReScaledImgY = originScaledImgY * (newScale / oldScale);
			
		// set scale and translation
		imgBox.scale = newScale;
		imgBox.translateX = originViewportX - originReScaledImgX;
		imgBox.translateY = originViewportY - originReScaledImgY;
			
		// transfer negative translations to scroll offset
		imgBox.scrollX = imgBox.scrollY = 0;
		
		if(imgBox.translateX < 0)
		{
			imgBox.scrollX = imgBox.translateX;
			imgBox.translateX = 0;
		}
		if(imgBox.translateY < 0)
		{
			imgBox.scrollY = imgBox.translateY;
			imgBox.translateY = 0;
		}
			
		
		// reset origin and update transform with new translation
		this.applyTransform(imgBox);

		// adjust scroll container
		this.adjustScroller(imgBox);
		
		// apply scroll
		imgBox.scroller.setOffset({
			x: imgBox.scrollX
			,y: imgBox.scrollY
		});
	}
		
	
	,applyTransform: function(imgBox) {
	
		if(Ext.is.Android)
			imgBox.imgEl.dom.style.webkitTransform = 'translate('+imgBox.translateX+'px, '+imgBox.translateY+'px) scale('+imgBox.scale+','+imgBox.scale+')';
		else
			imgBox.imgEl.dom.style.webkitTransform = 'translate3d('+imgBox.translateX+'px, '+imgBox.translateY+'px, 0) scale3d('+imgBox.scale+','+imgBox.scale+',1)';
		
	}


	,adjustScroller: function(imgBox) {
	
		// disable scrolling if zoomed out completely, else enable it
		if(imgBox.scale == imgBox.baseScale)
			imgBox.scroller.disable();
		else
			imgBox.scroller.enable();
		
		// size container to final image size
		var boundWidth = Math.max(imgBox.imgWidth * imgBox.scale, this.viewportWidth);
		var boundHeight = Math.max(imgBox.imgHeight * imgBox.scale, this.viewportHeight);

		imgBox.figEl.setStyle({
			width: boundWidth + 'px'
			,height: boundHeight + 'px'
		});
		
		// update scroller to new content size
		imgBox.scroller.updateBoundary();
	}

	// suppress carousel drag on multi-touch
	,onDragStart: function(e) {
		if(e.targetTouches.length == 1)
			Ext.Carousel.prototype.onDragStart.call(this, e);
	}
	,onDrag: function(e) {
		if(e.targetTouches.length == 1)
			Ext.Carousel.prototype.onDrag.call(this, e);
	}
	,onDragEnd: function(e) {
		if(e.targetTouches.length < 2)
			Ext.Carousel.prototype.onDragEnd.call(this, e);
	}

});

Ext.reg('pinch-carousel', Jarvus.mobile.PinchCarousel);