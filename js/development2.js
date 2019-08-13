
/*****************************************************************************
development.js interface for 3d-force-graph
******************************************************************************/

RENDER_QUICKER = false
RENDER_DEPTH = 50
RENDER_GALAXY = false
RENDER_DEPRECATED = false
RENDER_LABELS = true
GRAPH_DIMENSIONS = 3
//EXIT_DEPTH = 9;
dataLookup = {}

const LABEL_MAX_LINE_LENGTH = 30  // label text will be cut after first word ending before this character limit.
const LABEL_RE = new RegExp('(?![^\\n]{1,' + LABEL_MAX_LINE_LENGTH + '}$)([^\\n]{1,' + LABEL_MAX_LINE_LENGTH + '})\\s', 'g');
const GRAPH_DOM_EL = $("#3d-graph");
const GRAPH_BACKGROUND_COLOR = 0x302020
// For BFO layout: -2000, .01, .011
const GRAPH_CHARGE_STRENGTH = -100 // -2000 for BFO
const GRAPH_NODE_DEPTH = 100
const GRAPH_VELOCITY_DECAY = 0.4 // default 0.4
const GRAPH_ALPHA_DECAY = 0.0228 // default 0.0228
//const GRAPH_COOLDOWN_TIME = 1500 // default 15000
const GRAPH_LINK_WIDTH = .5
const GRAPH_COOLDOWN = 30000 // default 15000
//const GRAPH_COOLDOWN_TICKS = 50 // default 15000
const GRAPH_PARTICLES = 0 // animation that shows directionality of links
const ONTOLOGY_LOOKUP_URL = 'http://purl.obolibrary.org/obo/'
const CAMERA_DISTANCE = 300.0
const NO_LABELS = false


function do_graph(rawData) {
  /*
  Main function for loading a new data file and rendering a graph of it.

  */
  $(document.body).css({'cursor' : 'wait'});

  top.Graph = init() // Any possible memory leak on reload?
  top.rawData = rawData

  // Usual case for GEEM ontofetch.py ontology term specification table:
  data = init_geem_data(rawData)

  init_search(data) 

  //function updateGeometries() {
  //  Graph.nodeRelSize(4); // trigger update of 3d objects in scene
  //}

  // Too much overhead for particles on larger graphs 
  //Graph.linkDirectionalParticles( (data.nodes.length > 4000 || RENDER_QUICKER) ? 0 : GRAPH_PARTICLES)

  // Spread nodes a little wider
  Graph.d3Force('charge').strength(GRAPH_CHARGE_STRENGTH);
  //Graph.d3Force('link').strength(100);
  //Graph.d3Force('center').strength(10);

  // Getter/setter for the simulation intensity decay parameter, only 
  // applicable if using the d3 simulation engine.  
  //Graph.d3AlphaDecay(GRAPH_ALPHA_DECAY) // default 0.0228
  
  // Getter/setter for the nodes' velocity decay that simulates the medium
  // resistance, only applicable if using the d3 simulation engine.
  //Graph.d3VelocityDecay(GRAPH_VELOCITY_DECAY)  // default 0.4

  // Incrementally adds graph nodes in batches until maximum depth reached
  /*
  if (data.nodes.length) {
      //console.log(top.dataLookup)
      var maxDepth = top.builtData.nodes[top.builtData.nodes.length-1].depth;
      var depth = 1;
      var depthIterator = setInterval(function(){
        //console.log(depth);

        var newNodes = top.builtData.nodes.filter(n => n.depth >= depth)
        var newLinks = top.builtData.links.filter(l => top.dataLookup[l.target] && top.dataLookup[l.target].depth == depth);
        //console.log(newNodes)
        //console.log(newLinks)

        const { nodes, links } = Graph.graphData();
        Graph.graphData({
          nodes: [...nodes, ...newNodes],
          links: [...links, ...newLinks]
        });

        depth++
        if (depth == maxDepth) clearInterval(depthIterator);
      }, 5000);
  }*/
  
  $("#status").html(top.builtData.nodes.length + " terms");

  // Chop the data into two parts so first pulls most upper level categories into position.
  //var tempQ = top.RENDER_QUICKER
  //var tempL = top.RENDER_LABELS
  //top.RENDER_QUICKER = true
  //top.RENDER_LABELS = false

  var depthThreshold = 9
  var newNodes = top.builtData.nodes.filter(n => n.depth < depthThreshold)
  var newLinks = top.builtData.links.filter(l => top.dataLookup[l.target] && top.dataLookup[l.target].depth < depthThreshold);
  Graph.graphData({nodes: newNodes, links: newLinks});

  /*
  setTimeout(function(tempQ,tempL) {

    top.RENDER_QUICKER = tempQ
    top.RENDER_LABELS = tempL

  }, 1000)
  */

  if (newNodes.length != top.builtData.nodes.length) {

    setTimeout(function() {


      var newNodes = top.builtData.nodes.filter(n => n.depth >= depthThreshold)
      var newLinks = top.builtData.links.filter(l => top.dataLookup[l.target] && top.dataLookup[l.target].depth >= depthThreshold);
      //console.log(newNodes)
      //console.log(newLinks)

      const { nodes, links } = Graph.graphData();
      Graph.graphData({
        nodes: nodes.concat(newNodes), //[...nodes, ...newNodes],
        links: links.concat(newLinks) //[...links, ...newLinks]
      });
      
      $(document.body).css({'cursor' : 'default'});

    }, 8000)

  }
  else
    $(document.body).css({'cursor' : 'default'});

  /*
  // Navigate to root BFO node if there is one. Slight delay to enable
  // engine to create reference points.  Ideally event for this.
  if('BFO:0000001' in top.dataLookup) {
    setTimeout(function(){
      node_focus(top.dataLookup['BFO:0000001']) 
    }, 2000)
  }
  */

}

function refresh_graph() {
  // The graph engine is triggered to redraw its own data.
  if (top.Graph) {
    let { nodes, links } = Graph.graphData();
    Graph.graphData({"nodes":nodes, "links":links})
  }
}

function init() {

  return ForceGraph3D()(document.getElementById('3d-graph'))
      // Using D3 engine so we can pin nodes via { id: 0, fx: 0, fy: 0, fz: 0 }
    .forceEngine('d3') 
    .d3Force('center', null)  // Enables us to add nodes without shifting centre of mass or having a centre attractor
    .warmupTicks(0)
    .width(GRAPH_DOM_EL.width())
    .cooldownTime(GRAPH_COOLDOWN)
    //.cooldownTicks(300)
    .backgroundColor(GRAPH_BACKGROUND_COLOR)
    .numDimensions(GRAPH_DIMENSIONS)

    .cameraPosition({x:0, y:0, z: 3000 },{x:0, y:0, z: 0 })
    .linkOpacity(1)

    //.linkDirectionalParticles( RENDER_QUICKER ? 0 : GRAPH_PARTICLES) // done in do_graph
    .linkDirectionalParticleWidth(4)
    .linkDirectionalParticleSpeed(.002)
    //.nodeAutoColorBy('color')
    // Note d.target is an object!
    /*.linkAutoColorBy(d => d.target.color})*/
    .linkWidth(function(link) {return link.width})
    .linkResolution(3) // 3 sided, i.e. triangular beam
    .nodeLabel(node => `<div>${node.label}<br/><span class="tooltip-id">${node.id}</span></div>`) // Text shown on mouseover. //${node.definition}
    //.nodeColor(node => highlightNodes.indexOf(node) === -1 ? 'rgba(0,255,255,0.6)' : 'rgb(255,0,0,1)')
    .onNodeHover(node => GRAPH_DOM_EL[0].style.cursor = node ? 'pointer' : null)
    .onLinkClick(link => {node_focus(link.target)})
    /*
    .onLinkHover(link => {
      // no state change
      if (highlightLink === link) return;
      highlightLink = link;
      highlightNodes = link ? [link.source, link.target] : [];
      updateGeometries();
    })
    */
    .onNodeClick(node => node_focus(node))

    .nodeThreeObject(node => render_node(node))

    .onEngineStop(stuff => {

      // For BFO graph, create a string version of layout so that other
      // ontologies can be layed out under it.
      /*
      var nodes = []
      for (item in top.dataLookup) {
        var node = top.dataLookup[item];
        nodes.push({"id":node.id, "x":parseInt(node.x), "y":parseInt(node.y)})
      }
      console.log(JSON.stringify(nodes, null, 4))
      */
    })

    .graphData({ nodes: [], links: [] }); // so can add on incrementally

}
