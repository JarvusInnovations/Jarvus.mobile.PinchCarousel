Ext.ns('Jarvus.mobile');

Jarvus.mobile.ImageViewer = Ext.extend(Ext.Component, {

	doubleTapScale: 1
	,maxScale: 1
	,loadingMask: true
	,previewSrc: false
	,imageSrc: false
	,initOnActivate: false

	,cls: 'imageBox'
	,scroll: 'both'
	,html: [
		'<figure><img></figure>'
	]

	,initComponent: function() {
		Jarvus.mobile.ImageViewer.superclass.initComponent.apply(this, arguments);
	
		if(this.initOnActivate)
			this.on('activate', this.initViewer, this, {delay: 10, single: true});
		else
			this.on('afterrender', this.initViewer, this, {delay: 10, single: true});

	}
	
	
	,initViewer: function() {
		
		//	disable scroller
		this.scroller.disable();

		// mask image viewer
		if(this.loadingMask)
			this.el.mask(Ext.LoadingSpinner);

		// retrieve DOM els
		this.figEl = this.el.down('figure');
		this.imgEl = this.figEl.down('img');

		// apply required styles
		this.figEl.setStyle({
			overflow: 'hidden'
			,display: 'block'
			,margin: 0
		});

		this.imgEl.setStyle({
			'-webkit-user-drag': 'none'
			,'-webkit-transform-origin': '0 0'
			,'visibility': 'hidden'
		});

		// show preview
		if(this.previewSrc)
		{
			this.el.setStyle({
				backgroundImage: 'url('+this.previewSrc+')'
				,backgroundPosition: 'center center'
				,backgroundRepeat: 'no-repeat'
				,webkitBackgroundSize: 'contain'
			});
		}

		// attach event listeners
		this.mon(this.imgEl, {
			scope: this
			,load: this.onImageLoad
			,doubletap: this.onDoubleTap
			,pinchstart: this.onImagePinchStart
			,pinch: this.onImagePinch
			,pinchend: this.onImagePinchEnd
		});

		// load image
		if(this.imageSrc)
			this.loadImage(this.imageSrc);
			
	}
	
	,loadImage: function(src) {	
		if(this.imgEl)
			this.imgEl.dom.src = src;
		else
			this.imageSrc = src;
			
	}

	
	,onImageLoad: function() {
		// get viewport size
		this.viewportWidth = this.viewportWidth || this.getWidth() || this.ownerCt.body.getWidth();
		this.viewportHeight = this.viewportHeight || this.getHeight() || this.ownerCt.body.getHeight();
			
		// grab image size
		this.imgWidth = this.imgEl.dom.width
		this.imgHeight = this.imgEl.dom.height;
				
		// calculate and apply initial scale to fit image to screen
		if(this.imgWidth > this.viewportWidth || this.imgHeight > this.viewportHeight)
			this.scale = this.baseScale = Math.min(this.viewportWidth/this.imgWidth, this.viewportHeight/this.imgHeight);
		else
			this.scale = this.baseScale = 1;
		
		// set initial translation to center
		this.translateX = this.translateBaseX = (this.viewportWidth - this.baseScale * this.imgWidth) / 2;
		this.translateY = this.translateBaseY = (this.viewportHeight - this.baseScale * this.imgHeight) / 2;
		
		// apply initial scale and translation
		this.applyTransform();
		
		// initialize scroller configuration
		this.adjustScroller();

		// show image and remove mask
		this.imgEl.setStyle({ visibility: 'visible' });

		// remove preview
		if(this.previewSrc)
		{
			this.el.setStyle({
				backgroundImage: 'none'
			});
		}

		if(this.loadingMask)
			this.el.unmask();

		this.fireEvent('imageLoaded', this);
	}
	
	,onImagePinchStart: function(ev) {
		// disable scrolling during pinch
		this.scroller.stopMomentumAnimation();
		this.scroller.disable();
		
		// store beginning scale
		this.startScale = this.scale;
		
		// calculate touch midpoint relative to image viewport
		this.originViewportX = (ev.touches[0].clientX + ev.touches[1].clientX) / 2 - this.el.getX();
		this.originViewportY = (ev.touches[0].clientY + ev.touches[1].clientY) / 2 - this.el.getY();
		
		// translate viewport origin to position on scaled image
		this.originScaledImgX = this.originViewportX - this.scroller.offset.x - this.translateX;
		this.originScaledImgY = this.originViewportY - this.scroller.offset.y - this.translateY;
		
		// unscale to find origin on full size image
		this.originFullImgX = this.originScaledImgX / this.scale;
		this.originFullImgY = this.originScaledImgY / this.scale;
		
		// calculate translation needed to counteract new origin and keep image in same position on screen
		this.translateX += (-1 * ((this.imgWidth*(1-this.scale)) * (this.originFullImgX/this.imgWidth)));
		this.translateY += (-1 * ((this.imgHeight*(1-this.scale)) * (this.originFullImgY/this.imgHeight)))
	
		// apply new origin
		this.setOrigin(this.originFullImgX, this.originFullImgY);
	
		// apply translate and scale CSS
		this.applyTransform();
	}
	
	,onImagePinch: function(ev) {
		// prevent scaling to smaller than screen size
		this.scale = Ext.util.Numbers.constrain(ev.scale * this.startScale, this.baseScale, this.maxScale);
		this.applyTransform();
	}
	
	,onImagePinchEnd: function(ev) {
	
		// set new translation
		if(this.scale == this.baseScale)
		{
			// move to center
			this.setTranslation(this.translateBaseX, this.translateBaseY);
		}
		else
		{
			// calculate rescaled origin
			this.originReScaledImgX = this.originScaledImgX * (this.scale / this.startScale);
			this.originReScaledImgY = this.originScaledImgY * (this.scale / this.startScale);
			
			// maintain zoom position
			this.setTranslation(this.originViewportX - this.originReScaledImgX, this.originViewportY - this.originReScaledImgY);			
		}
		// reset origin and update transform with new translation
		this.setOrigin(0, 0);
		this.applyTransform();

		// adjust scroll container
		this.adjustScroller();
	}

	
	,onDoubleTap: function(ev, t) {
		
		if(!this.doubleTapScale)
			return false;
		
		// set scale and translation
		if(this.scale >= .9)
		{
			// zoom out to base view
			this.scale = this.baseScale;
			this.setTranslation(this.translateBaseX, this.translateBaseY);
		}
		else
		{
			// zoom in toward tap position
			var oldScale = this.scale
				,newScale = 1
				,originViewportX = ev ? (ev.pageX - this.el.getX()) : 0
				,originViewportY = ev ? (ev.pageY - this.el.getY()) : 0
				,originScaledImgX = originViewportX - this.scroller.offset.x - this.translateX
				,originScaledImgY = originViewportY - this.scroller.offset.y - this.translateY
				,originReScaledImgX = originScaledImgX * (newScale / oldScale)
				,originReScaledImgY = originScaledImgY * (newScale / oldScale);
				
			this.scale = newScale;
			this.setTranslation(originViewportX - originReScaledImgX, originViewportY - originReScaledImgY);
		}
			
		// reset origin and update transform with new translation
		this.applyTransform();

		// adjust scroll container
		this.adjustScroller();
		
		// force repaint to solve occasional iOS rendering delay
		Ext.repaint();
	}
	
	,setOrigin: function(x, y) {
		this.imgEl.dom.style.webkitTransformOrigin = x+'px '+y+'px';
	}
	
	,setTranslation:  function(translateX, translateY) {
		this.translateX = translateX;
		this.translateY = translateY;
			
		// transfer negative translations to scroll offset
		this.scrollX = this.scrollY = 0;
		
		if(this.translateX < 0)
		{
			this.scrollX = this.translateX;
			this.translateX = 0;
		}
		if(this.translateY < 0)
		{
			this.scrollY = this.translateY;
			this.translateY = 0;
		}
	}
		

	,applyTransform: function() {
	
		var fixedX = Ext.util.Numbers.toFixed(this.translateX,5)
			,fixedY = Ext.util.Numbers.toFixed(this.translateY,5)
			,fixedScale = Ext.util.Numbers.toFixed(this.scale, 8);
	
		if(Ext.is.Android)
		{
			this.imgEl.dom.style.webkitTransform = 
				//'translate('+fixedX+'px, '+fixedY+'px)'
				//+' scale('+fixedScale+','+fixedScale+')';
				'matrix('+fixedScale+',0,0,'+fixedScale+','+fixedX+','+fixedY+')'
		}
		else
		{
			this.imgEl.dom.style.webkitTransform =
				'translate3d('+fixedX+'px, '+fixedY+'px, 0)'
				+' scale3d('+fixedScale+','+fixedScale+',1)';
		}
		
	}


	,adjustScroller: function() {
	
		// disable scrolling if zoomed out completely, else enable it
		if(this.scale == this.baseScale)
			this.scroller.disable();
		else
			this.scroller.enable();
		
		// size container to final image size
		var boundWidth = Math.max(this.imgWidth * this.scale, this.viewportWidth);
		var boundHeight = Math.max(this.imgHeight * this.scale, this.viewportHeight);

		this.figEl.setStyle({
			width: boundWidth + 'px'
			,height: boundHeight + 'px'
		});
		
		// update scroller to new content size
		this.scroller.updateBoundary();

		// apply scroll
		this.scroller.setOffset({
			x: this.scrollX || 0
			,y: this.scrollY || 0
		});
	}

});

Ext.reg('imageviewer', Jarvus.mobile.ImageViewer);