
/*****************************************************************************
development2.js interface for 3d-force-graph
******************************************************************************/

RENDER_QUICKER = false
RENDER_DEPTH = 50
RENDER_GALAXY = false
RENDER_DEPRECATED = false
RENDER_LABELS = true
RENDER_ULO_EDGE = false
RENDER_OTHER_PARENTS = false
GRAPH_DIMENSIONS = 3
GRAPH_LINK_WIDTH = 3
EXIT_DEPTH = 26;
dataLookup = {}

var GRAPH_NODE_DEPTH = 100 // 100 
var RENDER_SLICES = false

const LABEL_MAX_LINE_LENGTH = 30  // label text is cut after first word ending before this character limit.
const LABEL_RE = new RegExp('(?![^\\n]{1,' + LABEL_MAX_LINE_LENGTH + '}$)([^\\n]{1,' + LABEL_MAX_LINE_LENGTH + '})\\s', 'g');
const GRAPH_DOM_EL = $("#3d-graph");
const GRAPH_BACKGROUND_COLOR = "#302020"
// For BFO layout: -2000, .01, .011
const GRAPH_CHARGE_STRENGTH = -10000 // -30000 = normal.  negative=repulsion; positive=attraction // -2000 for BFO

const GRAPH_LINK_HIGHLIGHT_RADIUS = 15
const GRAPH_VELOCITY_DECAY = 0.4// default 0.4
const GRAPH_ALPHA_DECAY = 0.0228 // default 0.0228
const GRAPH_NODE_RADIUS = 5
//const GRAPH_COOLDOWN_TIME = 1500 // default 15000
//const GRAPH_COOLDOWN = 30000 // default 15000
const GRAPH_COOLDOWN_TICKS = 50 // default 15000
const GRAPH_PARTICLES = 0 // animation that shows directionality of links
const ONTOLOGY_LOOKUP_URL = 'http://purl.obolibrary.org/obo/'
const CAMERA_DISTANCE = 300.0
const NO_LABELS = false
// Regular expression to match robot's markup triple explanation of unsatisfiable reasoning:
const RE_MD_TRIPLE = /\[(?<subject_label>[^\]]+)\]\((?<subject_uri>[^)]+)\) (?<relation>\w+) \[(?<object_label>[^\]]+)\]\((?<object_uri>[^)]+)\)/;
const RE_URL = /^https?:\/\/.+/i;
const RE_URL_ROOT = /^https?:\/\/[^#?]+/i;
const RE_NAMESPACE_URL = /(?<prefix>https?:\/\/.+[\/#](?<namespace>\w+)(?<separator>[_:]))(?<id>\w+)/;

const SYNONYM_FIELD = ["synonyms", 
  "oboInOwl:hasSynonym", 
  "oboInOwl:hasExactSynonym", 
  "oboInOwl:hasBroadSynonym", 
  "oboInOwl:hasNarrowSynonym", 
  "oboInOwl:hasRelatedSynonym"
]

function do_graph(rawData) {
  /*
  Main function for loading a new data file and rendering a graph of it.

  */
  $(document.body).css({'cursor' : 'wait'});

  top.Graph = init() // Any possible memory leak on reload?
  top.rawData = rawData
  node_focus()

  // Usual case for GEEM ontofetch.py ontology term specification table:
  data = init_ontofetch_data(rawData)
  init_search(data) 

  //Graph.linkDirectionalParticles(0)

  $("#status").html(top.builtData.nodes.length + " terms");

  // Chop the data into two parts so first pulls most upper level categories into position.
  //var tempQ = top.RENDER_QUICKER
  //var tempL = top.RENDER_LABELS
  top.RENDER_QUICKER = true
  top.RENDER_LABELS = false

  top.Graph
    //.linkDirectionalParticles(0)
    .d3Force('center', null)
    .d3Force('charge').strength(GRAPH_CHARGE_STRENGTH)

  // Incrementally adds graph nodes in batches until maximum depth reached
  if (data.nodes.length) {

      top.MAX_DEPTH = top.builtData.nodes[top.builtData.nodes.length-1].depth;
      top.NEW_NODES = []; // global so depth_iterate can see it

      if (true) {
        top.ITERATE = 1;
        Graph.cooldownTicks(GRAPH_COOLDOWN_TICKS) // initial setting
        Graph.graphData({nodes:[],links:[]})
      }
      else {
        Graph.cooldownTicks(GRAPH_COOLDOWN_TICKS*10) // initial setting
        Graph.graphData({nodes:data.nodes,links:data.links})
      }
  }
  
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
    Graph.nodeRelSize(4); 
    // new command Graph.refresh() ????

    // Some user commands require this complete restart?
    //  top.Graph = init()
  }
}

function init() {

  var graph = ForceGraph3D({controlType: 'orbit'})(document.getElementById('3d-graph'))

    // Using dfault D3 engine so we can pin nodes via { id: 0, fx: 0, fy: 0, fz: 0 }
    .forceEngine('d3')
    .d3Force('center', null)  // Enables us to add nodes without shifting centre of mass or having a centre attractor
    //.d3Force('charge').strength(GRAPH_CHARGE_STRENGTH)
    .width(GRAPH_DOM_EL.width())
    .warmupTicks(0)
    //.cooldownTime(GRAPH_COOLDOWN_TIME)
    .cooldownTicks(GRAPH_COOLDOWN_TICKS)
    .backgroundColor(GRAPH_BACKGROUND_COLOR)

    // Getter/setter for the simulation intensity decay parameter, only 
    // applicable if using the d3 simulation engine.  
    .d3AlphaDecay(GRAPH_ALPHA_DECAY) // default 0.0228
    
    // Getter/setter for the nodes' velocity decay that simulates the medium
    // resistance, only applicable if using the d3 simulation engine.
    .d3VelocityDecay(GRAPH_VELOCITY_DECAY)  // default 0.4

    // IS THERE A WAY TO FORCE CAMERA TO only pan, and rotate on x,y but not Z ?
    .cameraPosition({x:0, y:0, z: 3000 },{x:0, y:0, z: 0 })
    //.linkWidth(link => link === highlightLink ? 4 : 1)
    .linkWidth(function(link) {
      // 
      return link.highlight ? GRAPH_LINK_HIGHLIGHT_RADIUS : link.width > GRAPH_LINK_WIDTH ? link.width : GRAPH_LINK_WIDTH
    })
    // It would be great if we could make it dashed instead
    .linkColor(function(link) {
      return link.highlight ? link.highlight : link.color
    })

    .linkResolution(3) // 3 sided, i.e. triangular beam
    .linkOpacity(1)

    //.nodeAutoColorBy('color')
    // Note d.target is an object!
    /*.linkAutoColorBy(d => d.target.color})*/

    // Text shown on mouseover.  WAS node.label
    .nodeLabel(node => `<div>${node['rdfs:label']}<br/><span class="tooltip-id">${node.id}</span></div>`) 

    //.nodeColor(node => node.highlight ? 'color) // Note: this triggers refresh on each animation cycle
    //.nodeColor(node => highlightNodes.indexOf(node) === -1 ? 'rgba(0,255,255,0.6)' : 'rgb(255,0,0,1)')
    //.nodeColor(node => node.highlight ? '#F00' : node.color ) 
    
    // Not doing anything...
    .nodeRelSize(node => node.highlight ? 18 : 4 ) // 4 is default
    .onNodeHover(node => GRAPH_DOM_EL[0].style.cursor = node ? 'pointer' : null)
    .onLinkClick(link => {node_focus(link.target)})
    .onNodeClick(node => node_focus(node))
    .nodeThreeObject(node => render_node(node))

    // Do this only for 3d iterated version
    .onEngineStop(stuff => {
      depth_iterate()
    })

  return graph;

}


function depth_iterate() {
  /*
  Handles one iteration at depth n at a time.
  On each iteration, adds all nodes at that depth, and any connections to
  parents that they have.
  Only on top.EXIT_DEPTH iteration are labels rendered, thicker edges,
  and switch to given dimension.

  */
  if (top.ITERATE > top.EXIT_DEPTH) {
    //Graph.stopAnimation()
    Graph.pauseAnimation()
    top.NEW_NODES = []


    // WHERE SHOULD THIS GO????
    top.GRAPH = null
    return
  }

  // Convert all parent node flex coordinates to fixed ones.

  // ADD LOOSE OPTION FOR THIS!!!!

  for (item in top.NEW_NODES) {
    var node = top.NEW_NODES[item]

    // If it doesn't have to move any more because it has no kids,
    // then fix its position; it therefore get taken out of "cooldown" list
    // Thus speeding calculation
    if (node.children.length == 0) {
      node.fy = node.y;
      node.fx = node.x;
    }

    const parent = top.dataLookup[node.parent_id];
    if (parent) {
      parent.fx = parent.x;
      parent.fy = parent.y;
      // fix parent z
      if (RENDER_SLICES && !(node.id in top.layout))
        node.fx = parent.fx;
    }

    //if (GRAPH_DIMENSIONS == 2 && !(node.id in top.layout))
    //    node.fz = lookup_2d_z(node)+ 30

  }

  if (top.ITERATE < top.EXIT_DEPTH && top.ITERATE != top.MAX_DEPTH && top.ITERATE < top.RENDER_DEPTH) {

    top.Graph.d3Force('charge').strength(GRAPH_CHARGE_STRENGTH/(top.ITERATE*top.ITERATE) )

    top.NEW_NODES = top.builtData.nodes.filter(n => n.depth == top.ITERATE)

    if (top.NEW_NODES.length) {

      // freeze z coordinate
      for (item in top.NEW_NODES) {
        node = top.NEW_NODES[item]

        const parent = top.dataLookup[node.parent_id];

        // depth temporarily set close to parent so that it temporarily acts as antagonist 

        if (parent && GRAPH_DIMENSIONS == 2 && !(node.id in top.layout)) {
         // node.fz = lookup_2d_z(node) - 100
          node.fz = node_depth(node)
        }
        else
          node.fz = node_depth(node)
        /* can't set node.x, y on new nodes. */
      }

      // Issue: link with otherparent getting added by target depth BUT other parent not in nodes yet.
      var newLinks = top.builtData.links.filter(
        l => top.dataLookup[l.target] 
        && top.dataLookup[l.target].depth == top.ITERATE
        && l.other === false
        );
      
      Graph.cooldownTicks((top.NEW_NODES.length+30))
      //Graph.cooldownTicks((top.NEW_NODES.length+30))

      const { nodes, links } = Graph.graphData();

      $("#status").html('Rendering ' + (nodes.length + newLinks.length) + ' of ' + top.builtData.nodes.length + " terms, depth " + top.ITERATE);

      Graph.graphData({
        nodes: nodes.concat(top.NEW_NODES), // [...nodes, ...newNodes],
        links: links.concat(newLinks) //  [...links, ...newLinks]
      });
    }
    top.ITERATE ++;
  }

  else
    depth_iterate_exit()

}

function depth_iterate_exit() {

  // Final step: Flip into requested (2 or 3) dimensions, with parents fixed by their 2d (x, y) 
  console.log(' Ending with' + GRAPH_DIMENSIONS + ',' + top.ITERATE + ',' + top.MAX_DEPTH + top.RENDER_DEPTH)

  // Restores these settings after quick positional render without them.
  var flag = $("#render_labels:checked").length == 1
  if (top.RENDER_LABELS != flag) {
    top.RENDER_LABELS = flag
  }
  var flag = $("#render_quicker:checked").length == 1
  if (top.RENDER_QUICKER != flag) {
    top.RENDER_QUICKER = flag
  }
  //Graph.numDimensions(GRAPH_DIMENSIONS)

  $(document.body).css({'cursor' : 'default'});

  // Graph.d3Force('charge').strength(-100 ) // 
  // z coordinate reset to standard hierarchy
  for (item in top.builtData.nodes) {
    node = top.builtData.nodes[item]
    // This reduces crowdedness of labelling, otherwise labels are all on
    // same plane.
    if (GRAPH_DIMENSIONS == 2 && (node.id in top.layout)) {
      node.fz = 0  //lookup_2d_z(node)
    }
    else {
      const z_randomizer = Math.random() * 20 - 10
      node.fz = node_depth(node) + z_randomizer
    }

    // No need to have this node participate in force directed graph now.
    if (node.children.length == 0) {
      node.fy = node.y;
      node.fx = node.x;
    }

    const parent = top.dataLookup[node.parent_id];
    if (parent && RENDER_SLICES && !(node.id in top.layout))
      node.fx = parent.fx;

  }
  // don't make below var newNodes / var newLinks?
  var newNodes = top.builtData.nodes.filter(n => n.depth.within(top.ITERATE, top.RENDER_DEPTH))

  // Return link if target is within depth, or link is one of the "other, i.e. secondary links.
  var newLinks = top.builtData.links.filter(
    l => top.dataLookup[l.target] && ((RENDER_OTHER_PARENTS && l.other === true) 
      || (l.other === false && top.dataLookup[l.target].depth.within(top.ITERATE, top.RENDER_DEPTH))
    )
  );    
  /*
  // For some reason, can't code abovce as  .filter(l => function(l){...}) ?
  var newLinks = top.builtData.links.filter( l => function(l){
    target = top.dataLookup[l.target]
    // Return link if target is within depth, or link is one of the "other, i.e. secondary links.
    // 
    return (RENDER_OTHER_PARENTS && l.other ===true) || ((l.other === false) && target.depth >= top.ITERATE && target.depth <= top.RENDER_DEPTH)
  });
  */
 
  // Fetches existing tuple of nodes and links
  const { nodes, links } = Graph.graphData();

  const new_length = nodes.length + newNodes.length
  $("#status").html('Rendering ' + new_length + ' of ' + top.builtData.nodes.length + " terms, depth >= " + top.ITERATE);

  //Graph.cooldownTicks(new_length)  // GRAPH_COOLDOWN_TICKS * 3

  Graph.graphData({
    nodes: nodes.concat(newNodes),
    links: links.concat(newLinks)
  });

  top.ITERATE = top.EXIT_DEPTH+1;

  return; // End of it all.

} 

function lookup_2d_z(node) {
  // apply this to parent, not to a node that is being calculated.
  var parent = top.dataLookup[node.parent_id];
  // ISSUE: fixing node to parent z is causing pythagorean distance in force directed graph to screw up,
  // causing points to contract to centre.
  if (parent) {
    console.log ("z", parent.z)
    return (parent.z - 10.0)
  }
  return node_depth(node)
}

Number.prototype.within = function(a, b) {
  var min = Math.min.apply(Math, [a, b]),
      max = Math.max.apply(Math, [a, b]);
  return this >= min && this <= max;
};


