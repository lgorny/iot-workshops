IOTVIS = {}
IOTVIS.apiKey = "zDhVSHa8J25qn0gl29HjEmajLhmtgA95KM4WH19FWJd2pt2Y";
IOTVIS.feedID = "1319740444";

IOTVIS.nodes = [];
IOTVIS.colours = {};
IOTVIS.colours["temp"] = [0xFFD49B, 0xFFB991, 0xFF9A81, 0xFA6C78, 0xF13C6F];
IOTVIS.colours["hum"] = [0xC2F7F9, 0xA0E8E5, 0x9BD0DB, 0x79AFC6, 0x8FA7A8];
IOTVIS.colours["light"] = [0x8C849E, 0xB08292, 0xD5827C, 0xEC9261, 0xF8A21C];
IOTVIS.colours["uv"] = [0xFF0F77, 0xFF30D6, 0xDA44FF, 0x9644FF, 0x7D05FF];

IOTVIS.init = function(container, canvas)
{
	if(window.location.hash)
	{
		console.log("hash: " + window.location.hash);

		IOTVIS.feedID = window.location.hash.substring(1);
		console.log(IOTVIS.feedID);
	}

	IOTVIS.canvas = canvas;
	IOTVIS.canvasContainer = container;

	IOTVIS.CANVAS_SIZE = {};
	IOTVIS.CANVAS_SIZE.width = 100;
	IOTVIS.CANVAS_SIZE.height = 100;

	IOTVIS.stage = new PIXI.Stage(0x222222);
	IOTVIS.renderer = new PIXI.CanvasRenderer(100, 100, IOTVIS.canvas);

	IOTVIS.container = new PIXI.DisplayObjectContainer();

	IOTVIS.stage.addChild(IOTVIS.container);

	xively.setKey( IOTVIS.apiKey );
	xively.feed.get( IOTVIS.feedID, 
		function( data ) {  
			console.log(data);
			IOTVIS.masterNode = new IOTVIS.NodeMaster(data.title);
			IOTVIS.container.addChild(IOTVIS.masterNode.container);

	 		for(var i = 0; i < data.datastreams.length; i++)
	 		{
	 			IOTVIS.createNode(data.datastreams[i]);
	 		}
		}
	);

	requestAnimFrame( IOTVIS.render );
}

IOTVIS.updateBounds = function()
{
	if(IOTVIS.CANVAS_SIZE.width != IOTVIS.canvasContainer.clientWidth || IOTVIS.CANVAS_SIZE.height != IOTVIS.canvasContainer.clientHeight)
	{
		IOTVIS.CANVAS_SIZE.width = IOTVIS.canvasContainer.clientWidth;
		IOTVIS.CANVAS_SIZE.height = IOTVIS.canvasContainer.clientHeight;
		IOTVIS.renderer.resize(IOTVIS.CANVAS_SIZE.width, IOTVIS.CANVAS_SIZE.height);
	}
}

IOTVIS.render = function()
{
	IOTVIS.updateBounds();
	requestAnimFrame( IOTVIS.render );

	var nodeHeight = 260;
	var circleSize = Math.min(IOTVIS.CANVAS_SIZE.width, IOTVIS.CANVAS_SIZE.height);
	circleSize = (circleSize-nodeHeight)/2 ;

	var space = 360/IOTVIS.nodes.length;

	
	for(var i = 0; i < IOTVIS.nodes.length; i++)
	{
		IOTVIS.nodes[i].container.x = IOTVIS.CANVAS_SIZE.width/2 - 25 + circleSize * Math.cos((i * space - 20) * (Math.PI/180));
		IOTVIS.nodes[i].container.y = IOTVIS.CANVAS_SIZE.height/2 + circleSize * Math.sin((i * space - 20) * (Math.PI/180));
		IOTVIS.nodes[i].draw((i * space - 20));
	}
	if(IOTVIS.masterNode)
	{

		IOTVIS.masterNode.container.x = IOTVIS.CANVAS_SIZE.width/2 - 25;
		IOTVIS.masterNode.container.y = IOTVIS.CANVAS_SIZE.height/2;
	}

	IOTVIS.renderer.render(IOTVIS.stage);
}

IOTVIS.createNode = function(data)
{
	var values = {};
	values.current = Number(data.current_value);
	values.max = Number(data.max_value);
	values.min = Number(data.min_value);

	var node = new IOTVIS.Node(IOTVIS.feedID, data.id, data.tags[0], 0, null, values);
	node.container.y = 200;
	IOTVIS.container.addChild(node.container);

	IOTVIS.nodes.push(node);

}

IOTVIS.Node = function(feed, id, type, level, parent, values)
{
	console.log("New node: " + id);
	this.feed = feed;
	this.id = id;
	this.type = type;
	this.level = level;
	this.parent = parent;
	this.values = values;

	this.rects = [];

	this.step = 3;
	this.currentStep = 0;

	this.targetRotation = 0;

	console.log(this.values);

	this.container = new PIXI.DisplayObjectContainer();
	this.rectsContainer = new PIXI.DisplayObjectContainer();
	this.background = new PIXI.Graphics();
	this.current = new PIXI.Graphics();
	this.master = new PIXI.Graphics();
	this.idTextContainer = new PIXI.Graphics();

	this.idText = new PIXI.Text(this.id, {font:"15px Arial", fill:"#aaaaaa"});
	this.idText.x = -this.idText.width/2;

	var valueColor = IOTVIS.colours[this.type][0].toString(16);
	console.log(valueColor);

	this.valueText = new PIXI.Text("-", {font:"15px Arial", fill:'#'+valueColor});
	this.valueText.x = -this.valueText.width/2;
	this.valueText.y = -this.valueText.height/2;

	this.current.beginFill(IOTVIS.colours[this.type][0], 0.05);
	this.current.drawCircle(0, 0, 50);
	this.current.endFill();

	this.idTextContainer.addChild(this.idText);

	this.rectsContainer.addChild(this.current);
	this.master.addChild(this.rectsContainer);

	this.master.addChild(this.idTextContainer);
	this.master.addChild(this.valueText);

	this.container.addChild(this.master);


	this.createRects();

	/*var self = this;
	setInterval(function(){
		self.onDataUpdated(Math.random());
	}, getRandomArbitrary(1000, 10000));*/

	this.init();
}

IOTVIS.Node.prototype.constructor = IOTVIS.Node;
IOTVIS.Node.prototype.init = function()
{
	var self = this;
	xively.datastream.subscribe( this.feed, this.id, function(e, data)
		{
			self.onDataUpdated(data);
		}
	);

	this.draw();
}

IOTVIS.Node.prototype.createRects = function()
{
	var r = 0;

	var c = this.getColorByProgress(1);

	for(var i = 0; i < 360; i+=this.step)
	{
		var rect = this.getRect(1);

		r += this.step*(Math.PI/180);

		rect.x =  50 * Math.cos(-r - 90 * (Math.PI/180));
		rect.y =  50 * Math.sin(-r - 90 * (Math.PI/180));
		rect.rotation = -r + 180 * (Math.PI/180);
		rect.scale.y = 0;
		this.rectsContainer.addChild(rect);

		this.rects.push(rect);
	}
}

IOTVIS.Node.prototype.draw = function(position)
{

	this.idText.x = -this.idText.width/2;
	this.idText.y = -this.idText.height/2;

	this.idTextContainer.x =  (100 + this.idText.width/2) * Math.cos(position * (Math.PI/180));
	this.idTextContainer.y =  (100 + this.idText.width/2) * Math.sin(position * (Math.PI/180));
}

IOTVIS.Node.prototype.getCircle = function(value)
{
	var circle = new PIXI.Graphics();
	circle.beginFill(0x333333, 0.5);
	circle.drawCircle(0, 0, 2*value);
	circle.endFill();

	return circle;
}

IOTVIS.Node.prototype.getRect = function(value)
{
	var circle = new PIXI.Graphics();
	circle.beginFill(0xffffff, 0.5);
	circle.drawRect(0, 0, 2, 50);
	circle.endFill();

	return circle;
}

IOTVIS.Node.prototype.getColorByProgress = function(progress)
{
	var steps = 1/IOTVIS.colours[this.type].length;
	var colour;

	for(var i = 1; i < IOTVIS.colours[this.type].length+1; i++)
	{
		if(i * steps >= progress)
		{
			colour = IOTVIS.colours[this.type][i-1];
			break;
		}
	} 

	return colour;
}

IOTVIS.Node.prototype.redrawRect = function(rect)
{
	var c = this.getColorByProgress(rect.scale.y);

	rect.clear();
	rect.beginFill(c, 0.7);
	rect.drawRect(0, 0, 2, 40);
	rect.endFill();
}

IOTVIS.Node.prototype.onDataUpdated = function(data)
{
	this.values.current = Number(data.current_value);
	this.values.max = Number(data.max_value);
	this.values.min = Number(data.min_value);

	var progress = (this.values.current - this.values.min)/(this.values.max - this.values.min);
	if(this.values.min == this.values.max)
		progress = 1;

	this.targetRotation += this.step * (Math.PI/180);

	this.valueText.setText(this.values.current.toFixed(2).toString());
	this.valueText.x = -this.valueText.width/2;
	this.valueText.y = -this.valueText.height/2;

	var rect = this.rects[this.currentStep];

	var c = this.getColorByProgress(progress);
	var self = this;
	TweenMax.to(rect.scale, 0.5, {y: progress, delay:0.5, ease:Expo.easeOut, onUpdate:function(){
		self.redrawRect(rect);
	}});
	TweenMax.to(this.rectsContainer, 0.5, {rotation: this.targetRotation, ease:Expo.easeOut});

	this.currentStep ++;
	if(this.currentStep >= this.rects.length)
		this.currentStep = 0;

	IOTVIS.masterNode.onData(c, this);
}

IOTVIS.NodeMaster = function(id)
{
	this.id = id;
	this.container = new PIXI.DisplayObjectContainer();
	this.background = new PIXI.Graphics();
	this.color = new PIXI.Graphics();
	this.idLabel = new PIXI.Text(this.id, {font:"20px Arial", fill:'#aaaaaa'});
	this.idLabel.x = -this.idLabel.width/2;
	this.idLabel.y = -this.idLabel.height/2;

	this.background.beginFill(0x333333);
	this.background.drawCircle(0, 0, 100);
	this.background.endFill();

	this.container.masterNode = this;

	this.container.addChild(this.background);
	this.container.addChild(this.idLabel);
	
}

IOTVIS.NodeMaster.prototype.constructor = IOTVIS.NodeMaster;
IOTVIS.NodeMaster.prototype.onData = function(color, node)
{

	var colorCircle = new PIXI.Graphics();
	colorCircle.beginFill(color);
	colorCircle.drawCircle(0, 0, 100);
	colorCircle.endFill();
	colorCircle.alpha = 0;

	this.container.addChild(colorCircle);

	var cont = this.container;

	this.spawnData(color, node);
	TweenMax.to(colorCircle, 0.5, {alpha:0.5, ease:Expo.easeOut, delay: 0.7});
	TweenMax.to(colorCircle.scale, 0.5, {x: 1.1, y: 1.1, ease:Back.easeOut, delay: 0.7});

	TweenMax.to(colorCircle, 0.5, {alpha:0, ease:Expo.easeOut, delay: 1.1});
	TweenMax.to(colorCircle.scale, 0.51, {x: 1, y: 1, ease:Back.easeOut, delay: 1.1 , onComplete:function(){cont.removeChild(colorCircle);}});

}

IOTVIS.NodeMaster.prototype.spawnData = function(color, node)
{
	var circle = new PIXI.Graphics();
	circle.beginFill(color, 0.7);
	circle.drawCircle(0, 0, 5);
	circle.endFill();

	circle.alpha = 0;

	circle.x = node.container.x;
	circle.y = node.container.y;

	IOTVIS.container.addChildAt(circle, 0);
	TweenMax.to(circle, 1, {x: IOTVIS.masterNode.container.x, y: IOTVIS.masterNode.container.y, ease:Circ.easeOut, delay:0.5, onUpdate:function(){circle.alpha = 1;}, onComplete:function(){IOTVIS.container.removeChild(circle)}});
}

function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}