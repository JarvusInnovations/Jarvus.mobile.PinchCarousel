Ext.ns('Jarvus.mobile');

Jarvus.mobile.PinchCarousel = Ext.extend(Ext.Carousel, {

	loadingMask: true
	,images: false
	,store: false
	,imageField: 'image_url'
	,previewField: 'image_thumbnail_url'
	//,captionField: 'caption' // NOT YET IMPLEMENTED

	,initComponent: function() {
	
		this.items = this.items || [];
	
		if(this.store)
		{
			// initialize items from a store if provided
			this.store.each(function(imageRecord) {
				this.addImage({
					imageSrc: this.imageField ? imageRecord.get(this.imageField) : false
					,previewSrc: this.previewField ? imageRecord.get(this.previewField) : false
				});
			}, this);
		}
		else if(this.images)
		{
			// initialize items from an array of URLs or configs
			Ext.each(this.images, this.addImage, this);
		}
		
		Jarvus.mobile.PinchCarousel.superclass.initComponent.apply(this, arguments);
		
		
	}

	,addImage: function(image, doLayout) {

		image = Ext.apply({
			xtype: 'imageviewer'
			,initOnActivate: true
			,loadingMask: this.loadingMask
		}, typeof image == "string" ? {imageSrc: image} : image);
		
		if(this.rendered)
		{
			this.add(image);
			
			if(doLayout !== false)
				this.doLayout();
		}
		else
		{
			this.items.push(image);
		}
	}	

	// suppress carousel drag on multi-touch
	,onDragStart: function(e) {
		if(e.targetTouches.length == 1)
			Ext.Carousel.prototype.onDragStart.call(this, e);
/*
		if(e.targetTouches.length == 1 && (!this.getActiveItem().scroller || this.getActiveItem().scroller.disabled))
			Ext.Carousel.prototype.onDragStart.call(this, e);
		else
			console.log('suppressing drag start');
*/
	}
	,onDrag: function(e) {
		if(e.targetTouches.length == 1)
			Ext.Carousel.prototype.onDrag.call(this, e);
/*
		if(e.targetTouches.length == 1 && (!this.getActiveItem().scroller || this.getActiveItem().scroller.disabled))
			Ext.Carousel.prototype.onDrag.call(this, e);
		else
			console.log('suppressing drag');
*/
	}
	,onDragEnd: function(e) {
		if(e.targetTouches.length < 2)
			Ext.Carousel.prototype.onDragEnd.call(this, e);
/*
		if(e.targetTouches.length < 2 && (!this.getActiveItem().scroller || this.getActiveItem().scroller.disabled))
			Ext.Carousel.prototype.onDragEnd.call(this, e);
		else
			console.log('suppressing drag end');
*/
	}

});

Ext.reg('pinchcarousel', Jarvus.mobile.PinchCarousel);