
/*****************************************************************************

Development notes:

Graph parameters
  https://github.com/vasturiano/3d-force-graph

Force node position with:
  https://github.com/vasturiano/3d-force-graph/issues/90

Also see link hovering:
  https://github.com/vasturiano/3d-force-graph/issues/14

See forcing link size:
  https://github.com/d3/d3-force#forceLink

Example fetchs of ontology using the GEEM platform "ontofetch.py" program. 
It returns a flat json list of terms branching from given root (defaults 
to owl:Entity). No option currently to retrieve all terms - terms must have
a single root.

  python ontofetch.py http://purl.obolibrary.org/obo/bfo/2.0/bfo.owl -o data -r http://purl.obolibrary.org/obo/BFO_0000001
  python ontofetch.py https://raw.githubusercontent.com/obi-ontology/obi/master/obi.owl -o data
  python ontofetch.py https://raw.githubusercontent.com/DiseaseOntology/HumanDiseaseOntology/master/src/ontology/doid-merged.owl -o data
  python ontofetch.py https://raw.githubusercontent.com/obophenotype/human-phenotype-ontology/master/hp.owl -o data -r http://purl.obolibrary.org/obo/UPHENO_0001001
  python ontofetch.py https://raw.githubusercontent.com/AgriculturalSemantics/agro/master/agro.owl -o data
  python ontofetch.py https://raw.githubusercontent.com/arpcard/aro/master/aro.owl -o test -r http://purl.obolibrary.org/obo/ARO_1000001
  python ontofetch.py https://raw.githubusercontent.com/EBISPOT/ancestro/master/hancestro.owl -o test -r http://purl.obolibrary.org/obo/HANCESTRO_0004
  python ontofetch.py https://raw.githubusercontent.com/pato-ontology/pato/master/pato.owl -o test -r http://purl.obolibrary.org/obo/PATO_0000001
  python ontofetch.py https://raw.githubusercontent.com/PopulationAndCommunityOntology/pco/master/pco.owl -o test

  Note this misses 2 branches:
  python ontofetch.py https://raw.githubusercontent.com/Planteome/plant-ontology/master/po.owl -o test -r http://purl.obolibrary.org/obo/PO_0025131
  python ontofetch.py https://raw.githubusercontent.com/CLO-ontology/CLO/master/src/ontology/clo_merged.owl -o test -r http://purl.obolibrary.org/obo/BFO_0000001
  python ontofetch.py http://purl.obolibrary.org/obo/cmo.owl -o test -r http://purl.obolibrary.org/obo/CMO_0000000
  python ontofetch.py https://raw.githubusercontent.com/evidenceontology/evidenceontology/master/eco.owl -o test -r http://purl.obolibrary.org/obo/BFO_0000001

******************************************************************************/

RENDER_QUICKER = false
RENDER_DEPTH = 50
RENDER_GALAXY = false
RENDER_DEPRECATED = false
RENDER_LABELS = true
GRAPH_DIMENSIONS = 3

const LABEL_MAX_LINE_LENGTH = 30  // label text will be cut after first word ending before this character limit.
const LABEL_RE = new RegExp('(?![^\\n]{1,' + LABEL_MAX_LINE_LENGTH + '}$)([^\\n]{1,' + LABEL_MAX_LINE_LENGTH + '})\\s', 'g');
const GRAPH_DOM_EL = $("#3d-graph");
const GRAPH_BACKGROUND_COLOR = 0x302020
// For BFO layout: -2000, .01, .011
const GRAPH_CHARGE_STRENGTH = -100 // -2000 for BFO
const GRAPH_NODE_DEPTH = 100
const GRAPH_VELOCITY_DECAY = 0.4 // default 0.4
const GRAPH_ALPHA_DECAY = 0.0228 // default 0.0228
const GRAPH_COOLDOWN = 30000 // default 15000
const GRAPH_PARTICLES = 1 // animation that shows directionality of links
const ONTOLOGY_LOOKUP_URL = 'http://purl.obolibrary.org/obo/'
const CAMERA_DISTANCE = 300.0
const NO_LABELS = false

dataLookup = {}

init_search() 

// Selection list of all node labels allows user to zoom in on one
$("#ontology")
  .on('change', function(item){
    if (this.value > '') {
      loadData(this.value, do_graph)
    }
  })



// Try this in case URL had path, before chosen() is applied 
var auto_load = document.location.href.indexOf('?ontology=')
if (auto_load) {
    var choice = document.location.href.substr(auto_load+10).toLowerCase()
    $("#ontology").children(`option[value="data/${choice}.json"]`).attr("selected","selected");
    $("#ontology").trigger('change')
}

$("#ontology").chosen({placeholder_text_single: 'Select an item ...'})

// Selection list of all node labels allows user to zoom in on one
$("#label_search").on('change', function(item){
  if (this.value != '')
    node_focus(top.dataLookup[this.value])
})

// Top level setting controls whether shortcuts on rendering speed things up
$("#render_deprecated").on('change', function(item) {
  RENDER_DEPRECATED = this.checked
  if (top.Graph) do_graph (top.rawData) // Recalculate dataset with deprecated terms
})

// Top level setting controls whether shortcuts on rendering speed things up
$("#render_quicker").on('change', function(item) {
  RENDER_QUICKER = this.checked
  if (top.Graph) {
    // Have to put this here because Graph.graphData bypasses do_graph
    Graph.linkDirectionalParticles(  (data.nodes.length > 4000 || RENDER_QUICKER) ? 0 : GRAPH_PARTICLES)
    refresh_graph();
  }
})

$("#render_labels").on('change', function(item) {
  RENDER_LABELS = this.checked
  refresh_graph();
})

$("#render_dimensions").on('change', function(item) {
  GRAPH_DIMENSIONS = this.value
  if (top.Graph) {
    Graph.numDimensions(GRAPH_DIMENSIONS)
    refresh_graph();
  }
})

// Galaxy or hierarchic view
$("#render_galaxy").on('change', function(item) {
  RENDER_GALAXY = this.checked
  if (top.Graph) {
    let { nodes, links } = Graph.graphData();
    for (item in nodes) {
      var node = nodes[item]
      if (!layout[node.id]) {
        if (RENDER_GALAXY) { // release z position.
          node.fz = null  
        }
        else // reestablish z hierarchy
          node.fz = 500 - node.depth * GRAPH_NODE_DEPTH;
      }
    }
    Graph.graphData({"nodes":nodes, "links":links})
  }
})

// Controls depth of nodes being rendered.
$("#depth_control").on('change', function(item) {
  RENDER_DEPTH = parseInt(this.value)
  if (top.Graph) do_graph (top.rawData)
})

// Selection list of all node labels allows user to zoom in on one
$("#select_child").on('change', function(item){
  if (this.value != '')
    node_focus(top.dataLookup[this.value])
})


function loadData(URL, callback) {
  var xhttp = new XMLHttpRequest();
  xhttp.overrideMimeType("application/json");
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      try {
        var data = JSON.parse(this.responseText)
      }
      catch(err) {
        alert(err.message);
      }
      callback(data )
    }
  }
  xhttp.open("GET", URL, true);
  xhttp.send(null);
};


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
  Graph.linkDirectionalParticles( (data.nodes.length > 4000 || RENDER_QUICKER) ? 0 : GRAPH_PARTICLES)

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
    .width(GRAPH_DOM_EL.width())
    .warmupTicks(1)
    .cooldownTime(GRAPH_COOLDOWN)
    //.cooldownTicks(300)
    .backgroundColor(GRAPH_BACKGROUND_COLOR)
    .numDimensions(GRAPH_DIMENSIONS)
    // Using D3 engine so we can pin nodes via { id: 0, fx: 0, fy: 0, fz: 0 }
    .forceEngine('d3') 
    .cameraPosition({x:0, y:0, z: 1300 })
    .linkOpacity(1)

    //.linkDirectionalParticles( RENDER_QUICKER ? 0 : GRAPH_PARTICLES) // done in do_graph
    .linkDirectionalParticleWidth(4)
    .linkDirectionalParticleSpeed(.002)
    //.nodeAutoColorBy('color')
    // Note d.target is an object!
    /*.linkAutoColorBy(d => d.target.color})*/
    .linkWidth(1)
    .linkResolution(3)
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

    .nodeThreeObject(node => {
      // Displays semi-sphere, then overlays with label text
      var group = new THREE.Group();
      var fancyLayout = layout[node.id] || !RENDER_QUICKER

      if (layout[node.id])
        nodeRadius = 30
      else
        if (node.depth < 4) 
          var nodeRadius = 40 - node.depth*10
        // Plain rendering skips node sphere markers
        else
          var nodeRadius = fancyLayout ? 5 : 0;
 
      // 2D + 1D versions benefit from bumping nodeRadius down a bit.
      if (GRAPH_DIMENSIONS < 3 && nodeRadius > 25) nodeRadius = 25 
        
      if (fancyLayout || node.depth < 4) {
        //var geometry = new THREE.CircleGeometry(nodeRadius); // Doesn't provide 3d orientation
        var geometry = new THREE.SphereGeometry(nodeRadius, 8, 6, 0, Math.PI);
        var material = new THREE.MeshBasicMaterial( { color: node.color } );
        var circle = new THREE.Mesh( geometry, material );
        circle.position.set( 0, 0, 0 );
        group.add( circle );
      }


  // HACK for background sized to text; using 2nd sprite as it always faces camera.
  var spriteMap = new THREE.TextureLoader().load( "img/whitebox.png" );
  var spriteMaterial = new THREE.SpriteMaterial( { map: spriteMap, color: 0x808080 , opacity : 0.5} );


      if (RENDER_LABELS) {
        // label converted to first few words ...
        var label = node.label.replace(LABEL_RE, '$1*');
        var ptr = label.indexOf('*')
        if (ptr > 0) label = label.split('*',1)[0] + ' ...'
          label = label


        var sprite = new SpriteText(label);
        sprite.color = node.color;
        sprite.textHeight = 8;
        sprite.fontSize = 20;
        sprite.position.set( 0, fancyLayout ? 5 : 0, nodeRadius + 3 );

        if (fancyLayout) {
          var height = sprite._canvas.height
          var width = sprite._canvas.width

          const sprite2 = new THREE.Sprite( spriteMaterial );
          sprite2.position.set( 0, 5, nodeRadius + 2 );
          sprite2.scale.set(width/2, 10 , 1);

          group.add( sprite2 );
        }
        group.add( sprite );
      }
      /*
      else {
          var  sprite = new THREE.Sprite( spriteMaterial );
          sprite.position.set( 0, 5, nodeRadius + 1 );
          sprite.scale.set(10, 10 , 1);
      }
*/


      return group;
    })
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


function init_search(data) {
  // Create a select list of all the node labels, in alphabetical order.
  // Includes search of the node's synonyms via a customization of chosen.js
  var label_search = $("#label_search")
  label_search.empty().append('<option value="">Term search ...</option>')

  if (data) {      
    // search 
    var sorted_data = data.nodes.concat().sort(function(a,b) {
      return (a.label === undefined || a.label.localeCompare(b.label))
    })

    for (var item in sorted_data) {
      var node = sorted_data[item]
      var option = $(`<option value="${node.id}">${node.label}</option>`);
 
      // Search by node id + custom addition of synonym data
      option.attr('synonyms', node.id + ' ' + (node.synonyms ? ';' + node.synonyms : '')) ;

      label_search.append(option);
    }
  }
  
  label_search.chosen({
    placeholder_text_single: 'Term search ...',
    no_results_text: "Oops, nothing found!",
    disable_search_threshold: 10,
    search_contains: true, //substring search
  })

  label_search.prop('disabled', data && data.nodes.length > 0 ? false : true)
  label_search.trigger("chosen:updated");
  
}


function init_geem_data(rawData) {
  /*
  This is a 3 pass algorithm, but maybe scrunchable to 2 passes.
  */
  var data = {nodes:[], links:[]}
  top.dataLookup = {}


  //    var lookupId = item.iri.split("/").pop().replace('_',':')

  var node_lookup = {}
  // 1st pass does all the nodes.  (Matters if links come first?)
  for (var item in rawData.specifications) {
    var node = rawData.specifications[item]
    if (!node.deprecated || RENDER_DEPRECATED) {
      node.children = []
      var prefix = get_term_prefix(node.id)
      if (prefix in colorMapping)
        node.color = colorMapping[prefix].code
      else {
        console.log ('Missing color for ontology prefix ' + prefix + ' in ' + node.id)
        node.color = '#F00'

      }
      node.depth = null
      
      if (!node.label) node.label = node.id

      data.nodes.push(node)
      node_lookup[node.id] = node
    }
  }


  // 2nd pass does links:
  for (var item in data.nodes) {
    const node = data.nodes[item]
    const parent_id = node.parent_id
    if (parent_id && node_lookup[parent_id]) { // passed deprecated filter
      data.links.push({source:parent_id, target: node.id, color: node.color})
      // Keep track of all the child links
      node_lookup[parent_id].children.push(node.id)
    }

    // ESTABLISH "LIGHT" LINKS TO OTHER PARENTS?
  }


  // 3rd pass does depth calculation
  // Note - multihomed nodes get depth according to "official" parent.
  for (var item in rawData.specifications) {
    var node = rawData.specifications[item]
    if (!node.depth) {
      // Pop 
      var ancestors = [node]
      var focus = node
      while (focus.parent_id) {
        if (focus.id == focus.parent_id) {
          console.log('ERROR: ontology term has itself as parent:' + focus.id)
          focus.depth = 1;
          break;
        }
        focus = rawData.specifications[focus.parent_id]
        if (focus.depth) {
          break;
        }
        if (!focus.parent_id) {
          focus.depth = 1
          break;
        }
        ancestors.push(focus)
      }
      // focus now has depth to convey to all ancestors
      // Ancestors are in reverse order, from shallowest to deepest.
      // Bizarrely, ptr is a string if using "(ptr in ancestors)" !
      for (var ptr = 0; ptr < ancestors.length; ptr ++) {
        //don't use ancestor = ancestors.pop(); seems to intefere with data.nodes ???
        var ancestor = ancestors[ancestors.length - ptr - 1] 
        ancestor.depth = focus.depth + ptr + 1
      }
    }
  }


  // To support the idea that graph can work on top-level nodes first
  data.nodes.sort(function(a,b) { return (a.depth - b.depth) })

  if (RENDER_DEPTH != 50) 
    data.nodes = data.nodes.filter(n => n.depth <= RENDER_DEPTH); // Remove deeper nodes

  data.nodes.forEach((n, idx) => {top.dataLookup[n.id] = n }); 
  
  if (RENDER_DEPTH != 50) // uses top.dataLookup()
    data.links = data.links.filter(l => top.dataLookup[l.source] && top.dataLookup[l.target]); // Remove archaic links

  for (var item in data.nodes) {
    var node = data.nodes[item]

    if (!RENDER_GALAXY)
      // Initially fix all nodes
      node.fz = 500 - node.depth * GRAPH_NODE_DEPTH;

    // Give initial x,y hint based on parents
    var layout_node = layout[node.id]
    if (layout_node) {
      node.fz = 500 -node.depth * GRAPH_NODE_DEPTH;
      node.fx = layout_node.x;
      node.x = layout_node.x;
      node.fy = layout_node.y;
      node.y = layout_node.y;
    }

    else // Is this working at all? Doesn't seem like it.
      if (node.parent_id) {
        var parent = top.dataLookup[node.parent_id]
        if (parent && parent.x !== undefined) {
          node.x = parent.x +  parseInt(Math.random() * 20-10)
          node.y = parent.y +  parseInt(Math.random() * 20-10)
        }
      }
     
  }
  top.builtData = data
  return data
}

function get_term_prefix(entity_id) {
  return entity_id.split(':')[0].split('#')[0]
}

function lookup_url(term_id, label) {
  /* Returns native term URI as well as OLS link
  */
  if (!label)
    label = top.dataLookup[term_id].label

  var ols_lookup_URL = null
  // If no prefix, then whole term_id returned, and its probably a URI
  var prefix = get_term_prefix(term_id) 
  if (prefix == term_id) { 
    var term_url = term_id
  }
  else {
  // A prefix was recognized
    ols_lookup_URL = `https://www.ebi.ac.uk/ols/ontologies/${prefix}/terms?iri=`
    term_url = top.rawData['@context'][prefix]
    if (!term_url) {
      term_url = ONTOLOGY_LOOKUP_URL
    }
    term_url = term_url + term_id.split(/[:#]/)[1]

  }

  return  `<a href="${term_url}" target="_term">${label}</a>` + (ols_lookup_URL ? `, <a href="${ols_lookup_URL}${term_url}" target="_term">OLS</a> ` : '')
}


function get_term_id_urls(parent_list) {
  var parent_uris = []
  if (parent_list) {
    for (ptr in parent_list) {
      parent_id = parent_list[ptr]
      var parent = top.dataLookup[parent_id]
      if (parent) {
        if (parent.label)
          parent_label = parent.label
        else
          parent_label = parent_id
        parent_uris.push(`<span class="focus" onclick="node_focus(top.dataLookup['${parent_id}'])">${parent_label}</span>`)
      }
      else {
        parent_uris.push('unrecognized: ' + parent_id)
      }
    }
  }
  return parent_uris.length ? parent_uris.join(', ') : null
}


function node_focus(node) {
  if (!node) {alert("Problem, node doesn't exist"); return}

  if (node.parent_id)
    var parents = [node.parent_id]
  else
    var parents = ['(none)']
  if (node.other_parents)
    parents.push(node.other_parents)

  parents = get_term_id_urls(parents)

  // Label includes term id and links to 
  label = node.label + '<span class="label_id"> (' + node.id + (node.deprecated ? ' <span class="deprecated">deprecated</span>' : '') + ' ' +lookup_url(node.id, 'OntoBee' ) + ') </span>'
  // <img src="img/link_out_20.png" border="0" width="16">
  $("#parents").html(parents || '<span class="placeholder">parent(s)</span>');
  $("#label").html(label || '<span class="placeholder">label</span>');
  $("#definition").html(node.definition || '<span class="placeholder">definition</span>');
  $("#synonyms").html(node.synonyms || '<span class="placeholder">synonyms</span>');
  
  if (node.ui_label)
    $("#ui_label").show().html(node.ui_label);
  else
    $("#ui_label").hide()

  if (node.ui_definition)
    $("#ui_definition").show().html(node.ui_definition);
  else
    $("#ui_definition").hide()

  var select_child = $("#select_child")
  select_child.empty()
  select_child.css('visibility', node.children.length > 0 ? 'visible':'hidden')
  if (node.children.length > 0) {
    var option = document.createElement("option");
    select_child.append('<option value="">children ...</option>')

    for (var item in node.children) {
      const child = top.dataLookup[node.children[item]]
      if (child) // How couldn't it be?  Filtered?
        select_child.append(`<option value="${child.id}">${child.label}</option>`)
    }
  }


  // Aim at node from z dimension
  // STRANGELY CAMERA LOOSES ITS "UP" POSITION if trying to view from side?
  // bring camera up, then down again?
  Graph.cameraPosition(
    {x: node.x, y: node.y - CAMERA_DISTANCE/3 , z: node.z + CAMERA_DISTANCE}, // new position
    node, // lookAt ({ x, y, z })  
    3000  // 3 second transition duration
  )
}
