var width = 1200,
    height = 1600;

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

var projection = d3.geo.albers()
		.center([22.04,40.68])
		.scale(180000)
		.translate([width/2,height/2]);

var path = d3.geo.path()
    .projection(projection);	

var color = d3.scale.pow()
		.exponent(1)
		.range(['#ffffff','#006d43'])
		.domain([0.0,100.0]);	

var div; 

queue()
	.defer(d3.json, "censustracts.json")
	.defer(d3.json, "neighborhood_tabulation_areas.json")
	.defer(d3.csv, "turnover.csv")	
	.await(ready);
	
function unpack(json) {
	json.features.forEach(function(obj) {
		var dom = document.createElement('div');
		dom.innerHTML = obj.properties.Description;
		var vals = dom.getElementsByClassName('atr-value');
		var keys = dom.getElementsByClassName('atr-name');
		for(idx = 0;idx < vals.length; idx++) {
			obj.properties[keys[idx].textContent] = vals[idx].textContent;
		}
	});
}	
	
function ready(error,tracts,ntas,turnover_csv) {	
	tracts.features.forEach(function(tract) {
		tract.geometry.geometries.splice(0,1);
	});

	ntas.features.forEach(function(nta) {
		nta.properties['center'] = nta.geometry.geometries[0];
		nta.geometry.geometries.splice(0,1);
	});
	
	unpack(tracts);
	unpack(ntas);
	
	// Filter bad tract in Queens
	tracts.features = tracts.features.filter(function(t) {
		return t.properties['Name'] != 'geo_ysjj-vb9j-1.2160';
	});
	
	var boro_translation = {'New York': 'Manhattan',
													'Kings': 'Brooklyn',
													'Richmond': 'Staten Island',
													'Bronx': 'Bronx',
													'Queens': 'Queens'};
	var turnover = {};
	turnover_csv.forEach(function(row) {
		row['Turnover'] = +row['Turnover'];
		row['Boro'] = boro_translation[row['Boro']];	
		if(!turnover[row['Boro']]) {
			turnover[row['Boro']] = {};
		}
		turnover[row['Boro']][row['CT']] = row;
	});	

	svg.append("g")
    .selectAll("path")
    	.data(tracts.features)
    .enter().append("path")
			.attr("class","tract")
			.style('fill',function(d) { 
				var tract_number = d['properties']['CT2000'];
				var boro = d['properties']['BoroName'];
				if(turnover[boro][tract_number]) {
					var val = turnover[boro][tract_number]['Turnover'];
					return color(val); 
				} else {
					return 'none';
				}
			})
      .attr("d", path)
      .on("mouseover", mouseover)
		 	.on("mousemove", function(d) { 
		 		var tract_number = d['properties']['CT2000'];
				var boro = d['properties']['BoroName'];
			 	mousemove(d.properties['NTANAme'],
			 		turnover[boro][tract_number]['Turnover']); 
			 })
		 	.on("mouseout", mouseout);
		
	svg.append("g")
		 .selectAll("path")
		 .data(ntas.features)
		 .enter().append("path")
		 .attr("class","nta")
		 .attr("d",path)
		 .style("fill","none")
		 .style("stroke","#515A66")
		 .style("stroke-width",0.5);
		 
	div = d3.select("body").insert("div")
    .attr("class", "tooltip")
    .style("opacity", 1e-6);		       
}	

function mouseover() {
	div.transition()
      .duration(100)
      .style("opacity", 1);
}

function mousemove(nta,turnover) {
  div
      .text(nta + ' ' + turnover + "%")
      .style("left", (d3.event.pageX - (5*nta.length/2)) + "px")
      .style("top", (d3.event.pageY - 60) + "px");
}

function mouseout() {
  div.transition()
      .duration(100)
      .style("opacity", 1e-6);
}