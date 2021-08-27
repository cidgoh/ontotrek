
/*****************************************************************************
common.js interface for 3d-force-graph

Functions to drive 3d-force-graph that are core.  More experimental stuff is
in other files like development.js .  These files are loaded in addition to
/js/bundle.js , which is created by node.js's browserify command.

Work with rdflib.js is documented via:
  https://solid.inrupt.com/docs/manipulating-ld-with-rdflib

This program can work directly off of .owl files in RDF/XML format. They can
be stored locally in the /data folder, or provided in a URL

_____________________________
Node.js NPM Management:

  To update 3d-force-graph run this in ontotrek root folder:
  
  > npm update 

  To update /js/bundle.js which needs latest 3d-force-graph, need to run 
  browserify.org's "browserify" command. To load it (may need sudo su):

  > npm install -g browserify
  > npm install uniq 

  Then in /js folder, regenerate bundle.js based on super-basic index.js

  > browserify index.js -o bundle.js

_____________________________
Development notes:

Graph parameters
  https://github.com/vasturiano/3d-force-graph

Force node position with:
  https://github.com/vasturiano/3d-force-graph/issues/90

Also see link hovering:
  https://github.com/vasturiano/3d-force-graph/issues/14

See forcing link size:
  https://github.com/d3/d3-force#forceLink

_____________________________
The Ontology Json File Format

A legacy JSON format data file can also be supplied in /data/ is generated 
by ontofetch.py from an OWL ontology file.  This is being phased out.

Example fetchs of ontology using "ontofetch.py" program. 
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
  python ~/GitHub/GEEM/scripts/ontofetch.py https://raw.githubusercontent.com/biobanking/biobanking/master/ontology/obib.owl

  python3 ../ontofetch/ontofetch.py http://www.onto-med.de/ontologies/gfo.owl -o data/ -r http://www.onto-med.de/ontologies/gfo.owl#Entity,http://www.onto-med.de/ontologies/gfo.owl#Material_persistant

  python3 ../ontofetch/ontofetch.py http://purl.obolibrary.org/obo/ma.owl -o data/ -r http://purl.obolibrary.org/obo/MA_0000001

  PROBLEM CASE: Many terms, little class/subclass structure
  python3 ../ontofetch/ontofetch.py https://raw.githubusercontent.com/obophenotype/mouse-anatomy-ontology/master/emapa.owl -o data/ -r http://purl.obolibrary.org/obo/EMAPA_0

******************************************************************************/

init_search() 
init_interface()
   
$(document).foundation()

// Try this in case URL had path, before chosen() is applied 
var auto_load = document.location.href.indexOf('?ontology=')
if (auto_load) {
    var choice = document.location.href.substr(auto_load+10).toLowerCase()
    $("#ontology").children(`option[value="data/${choice}.json"]`).attr("selected","selected");
    $("#ontology").trigger('change')
}


function init_interface() {
  // Selection list of all node labels allows user to zoom in on one
  $("#ontology")
    .on('change', function(item){
      if (this.value > '') {
          load_data(this.value, do_graph)
          // load_data(this.value, load_graph)
      }
    })

  $("#ontology").chosen({placeholder_text_single: 'Select an item ...'})

  // Selection list of all node labels allows user to zoom in on one
  $("#label_search").on('change', function(item){
    if (this.value != '')
      node_focus(top.dataLookup[this.value])
  })

  //$("#ontology_url").on('change', function(item) {
  //  alert("Fetching: " + this.value)
  //  get_ontology(this.value)
  //})

  $("#ontology_url_button").on('click', function(item) {
    const url = $("#ontology_url").val()
    const url_ok = RE_URL.exec(url)
    if (url_ok)
      try {
        load_data(url, do_graph)
      }
      catch (err) {
          alert("URL fetch didn't work. Note, URL must point directly to an owl rdf/xml file.  It can't be redirected to another location: " + err.message)
          data = null;
      }
    else
      alert(`The ontology URL: "${url}" is not valid`)
  })

  // Top level setting controls whether shortcuts on rendering speed things up
  $("#render_deprecated").on('change', function(item) {
    RENDER_DEPRECATED = this.checked
    if (top.Graph) do_graph (top.rawData) // Recalculate dataset with deprecated terms
  })

  // upper level ontology edge coloring
  $("input[name='ulo_edge_coloring']").on('change', function(item) {
    RENDER_ULO_EDGE = (this.value == 'true')
    if (top.Graph) {
      //refresh_graph();
      do_graph (top.rawData)
    }
  })

  // Top level setting controls whether shortcuts on rendering speed things up
  $("#render_slices").on('change', function(item) {
    RENDER_SLICES = this.checked
    if (top.Graph) do_graph (top.rawData) // Recalculate dataset with deprecated terms
  })

  $("#thickness_control").on('change', function(item) {
    GRAPH_LINK_WIDTH = parseFloat(this.value)
    if (top.Graph) {
      refresh_graph();
    }
  })

  // Top level setting controls whether shortcuts on rendering speed things up
  $("#render_quicker").on('change', function(item) {
    RENDER_QUICKER = this.checked
    if (top.Graph) {
      refresh_graph();
    }
  })

  $("#render_labels").on('change', function(item) {
    RENDER_LABELS = this.checked
    refresh_graph();
  })

  $("#render_other_parents").on('change', function(item) {
    RENDER_OTHER_PARENTS = this.checked
    do_graph (top.rawData)
    // FUTURE: Just toggle visibility via WEBGL
  })

  $("#render_dimensions").on('change', function(item) {
    GRAPH_DIMENSIONS = parseInt(this.value)
    if (top.Graph) {
      // It appears iterative algorithm doesn't work with num dimensions
      // because it fixes x,y,z of parent nodes.  Must switch to alternate
      // rendering algorithm, or relax x,y,z for nodes below a certain depth.
      Graph.numDimensions(GRAPH_DIMENSIONS)
      
      do_graph(top.rawData)
      //For rsome re

    }
  })

  $("#render_layer_depth").on('change', function(item) {
    GRAPH_NODE_DEPTH = parseInt(this.value)
    if (top.Graph) {
      do_graph (top.rawData)
    }
  })

  /* / Galaxy or hierarchic view
  $("#render_galaxy").on('change', function(item) {
    RENDER_GALAXY = this.checked
    if (top.Graph) {
      let { nodes, links } = Graph.graphData();
      for (item in nodes) {
        var node = nodes[item]
        if (!top.layout[node.id]) {
          if (RENDER_GALAXY) { // release z position.
            node.fz = null  
          }
          else // reestablish z hierarchy
            node.fz = node_depth(node);
        }
      }
      Graph.graphData({"nodes":nodes, "links":links})
    }
    })*/

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

  // Trace works on ROBOT "explain" Markdown format report.
  $("#trace_button").on('click', function(item){
    var trace_content = $('#trace_content').val().trim()
    if (trace_content != '') {

      // DisjointWith node to focus on in analysis, if any.
      var focus = null 

      var content = trace_content.split('\n')
      // Set up these arrays to catch any new nodes or links not existing in current graph
      var new_nodes = []
      var new_links = []

      for (ptr in content) {

        var result = triple_parse(content[ptr])

        if (result) {

          var subject_node = get_node_from_url(new_nodes, result.subject_uri, result.subject_label)
          var object_node = get_node_from_url(new_nodes, result.object_uri, result.object_label)

          if (subject_node && object_node)
            switch (result.relation) {

              case 'DisjointWith':
                // Find shared parent class/node of both those nodes 
                // - that is where disjointness is defined?
                //alert(source_id + " disjoint with " + target_id)
                link = get_link(new_links, subject_node, object_node, result.relation, 0xFF0000, 20); // RED
                // Set Focus here
                link.highlight = 0xFF0000;
                focus = subject_node;
                break;

              case 'SubClassOf': 
                link = get_link(new_links, object_node, subject_node, result.relation, 0xFFA500, 10); // Orange
                link.highlight = 0xFFA500;
                break;                 
            }
        }
      }

      // There are new node or links to add
      if (new_nodes.length || new_links.length) {
        const { nodes, links } = top.Graph.graphData();
        nodes.push(...new_nodes);
        links.push(...new_links);
        Graph.graphData({
          'nodes': nodes,
          'links': links
        });

      }

      refresh_graph(); // Trigger update of 3d objects in scene

      if (focus)
        node_focus()
    }
  })
}


/************************** CONTRADICTION REPORTING ***************************/

function triple_parse (line) {
  /* This is for the superimposition of robot unsatisfiability explanations.
  Find markdown expression of [subject relation object] tripe and return
  a dictionary of each element.
  
  INPUT: a text line hopefully of Markdown format representation of a triple
  generated by the "robot" program (https://robot.obolibrary.org/). Each line
  looks like a triple of form:

    "- [geopolitical region](http://semanticscience.org/resource/SIO_000415) SubClassOf [designated area on Earth](http://purl.obolibrary.org/obo/GENEPIO_0001886)"

  OUTPUT: A dictionary key values in pattern of:

    { object_label: "immaterial entity"
      object_uri: "http://purl.obolibrary.org/obo/BFO_0000141"
      relation: "DisjointWith"
      subject_label: "material entity"
      subject_uri: "http://purl.obolibrary.org/obo/BFO_0000040"
    }
  
  */

  var matchObj = RE_MD_TRIPLE.exec(line);
  if (matchObj)
    return matchObj.groups

  //console.log("line", line, "regex", matchObj)
  return null
}


function get_node_from_url(new_nodes, url, label) {
  /*  RE_NAMESPACE_URL on ontology term URL returns dictionary {
    prefix: "http://purl.obolibrary.org/obo/BFO_",
    namespace: "BFO",
    id: 123456}
  */
  const re_node = RE_NAMESPACE_URL.exec(url)
  if (re_node) {
    groups = re_node.groups
    node_id = groups.namespace + ':' + groups.id
    var node = top.dataLookup[node_id]
    if (!node) {
      node = make_node(new_nodes, node_id, label)
    }
    node.highlight = true;
    return node
  }
  
  console.log("Problem parsing:", url)
  return node
}

function make_node(new_nodes, node_id, label) {
  // Used in Markdown to triple conversion
  // FUTURE: Code z-axis based on depth call.
  node = {
    'id': node_id,
    'rdfs:label': label,
    'rdfs:subClassOf': [],
    'parent_id': null,
    'IAO:0000115': '',

    'color':      '#FFF', 
    'depth':      4, // This just gives them a bigger but not giant label
    'children':   []
  }
  new_nodes.push(node)
  top.dataLookup[node.id] = node
  return node
}

function get_link(new_links, source, target, label, hex_color, width) {
  /* Highlights link between source_id node and target_id node.
  Makes a link if one doesn't exist and adds to new_links.
  */

  var link = top.linkLookup[`${source.id}-${target.id}`]
  if (!link) {
    link = set_link(new_links, source.id, target.id, label, hex_color, width) // + other=true ?
  }
  return link
  /* This is direct access code to link that has already been entered into
  graph. Issue with direct access is THREE is reusing material definitions as 
  objects on creation. Can't set color of individual materials.  Seems to
  be a different story for nodes which are individually created materials.
  if (link.__lineObj) {
    link.__lineObj.material.color.setHex(hex_color)
    link.__lineObj.scale.x = 2
    link.__lineObj.scale.y = 2
    link.__lineObj.scale.z = 2
  }
  */

}


function highlite_node(node, hex_color = 0xFF0000) {
  /* Emphasize node in red directly in rendering engine. Sticks to current
  build of graph.
  */

  /* Works temporarily until next Graph.Refresh()
  if (node && node.marker.material) {

    node.marker.material.color.setHex(hex_color);  // e.g. 0xFF0000
    node.marker.scale.x = 3
    node.marker.scale.y = 3
    node.marker.scale.z = 3
    //console.log(node)
  }
  */
  return node
}


function load_data(URL, callback) {
  /*
    Fetch json data file that represents simplified .owl ontology
    OR owl file in rdf/xml format 
  */

  var xhttp = new XMLHttpRequest();
  //Access-Control-Allow-Origin
  //* header value 
  // FOR WEBSERVER???
  var json_file_type = URL.toLowerCase().indexOf('json') > 0
  if (json_file_type)
    xhttp.overrideMimeType("application/json");
  else
    xhttp.overrideMimeType("rdf/xml");

  xhttp.onreadystatechange = function() {
    if (this.readyState == 4) {
      if (this.status == 200) {
        try {
          if (json_file_type) {
            var data = JSON.parse(this.responseText)

            // CONVERSION JSON data to work with new OWL format
            Object.keys(data.specifications).forEach(function(id) {
              var node = data.specifications[id]
              node['rdfs:subClassOf'] = [node.parent_id]
              if (node.label) node['rdfs:label'] = node.label
              if (node.definition) node['IAO:0000115'] = node.definition
              if (node.deprecated) node['owl:deprecated'] = node.deprecated

              if (node.other_parents) node['rdfs:subClassOf'].push(...node.other_parents)
            })

            data.term = data.specifications;
            delete(data.specifications)

          }
          else {
            var store = $rdf.graph();
            // Give it a full URL so OWL has proper file address
            if (URL.indexOf('http') != 0)
              URL = RE_URL.exec(document.location) + URL;

            try {
              // Given url is used simply to identify ontology source.
              // Good tips here: https://github.com/solid/solid-tutorial-rdflib.js/issues/4
              $rdf.parse(this.responseText, store, URL, 'application/rdf+xml');
              data = process_ontology(store);
              var store = $rdf.graph();      
            } 

            catch (err) {
                console.log(err)
                alert("OWL couldn't parse" + err.message)
                data = null;
            }
          }
        }
        catch(err) {
          alert(err.message);
          data = null;
        }

        callback(data )
      }
      else {
        alert("There was a problem loading this URL! (If it redirects somewhere, that isn't allowed): " + URL)
      }
    }
  }
  xhttp.open("GET", URL, true);
  xhttp.send(null);
};


function init_search(data) {
  /*
    Create a select list of all the node labels, in alphabetical order.
    Includes search of the node's synonyms via a customization of chosen.js
  */

  var label_search = $("#label_search")
  label_search.empty().append('<option value="">Term search ...</option>')

  if (data) {      
    // search 
    var sorted_data = data.nodes.concat().sort(function(a,b) {
      return (a.label === undefined || a.label.localeCompare(b.label))
    })

    for (var item in sorted_data) {
      var node = sorted_data[item]
      var option = $(`<option value="${node.id}">${node['rdfs:label']}</option>`);
 
      // Search by any of the terms related synonyms
      var synonyms = []
      SYNONYM_FIELD.forEach(function(synonym) {
        if (node[synonym])
          synonyms.push(node[synonym])
      });
      var synonym_str = synonyms.length ? ';' + synonyms.join(';') : '';

      // Allows searching by node id as well.
      option.attr('synonyms', node.id + synonym_str); 

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


function init_ontofetch_data(rawData) {
  /*
  This is a 2 pass algorithm.
  
  1st pass: Establish node depth and label, and color based on node prefix.
  2nd pass: Establish links and adjust according to parent node depth.

  INPUT
    rawData.term: Array of nodes

  */

  // Lookup table from node_id to Graph node
  top.dataLookup = {}
  // Lookup table from "[link source_id]-[link target_id]" to Graph link
  top.linkLookup = {}

  var data = {
    'nodes':[], 
    'links':[]
  }
  top.builtData = data

  if (!rawData)
    return data;

  //var node_lookup = {}
  var legend = {}
  // 1st pass does all the nodes.
  for (var item in rawData.term) {
    var node = rawData.term[item];
    if (!node['owl:deprecated'] || RENDER_DEPRECATED) { // node.deprecated
      node.children = [];
      var prefix = get_term_prefix(node.id);
      // Stores a count of each prefix
      legend[prefix] = prefix in legend ? legend[prefix]+1 : 1;

      if (prefix in prefix_color_mapping){
        node.color = colors[prefix_color_mapping[prefix].color];

      }
      else {
        console.log ('Missing color for ontology prefix ' + prefix + ' in ' + node.id)
        node.color = '#F00'
      }
      node.depth = 0;
      set_node_label(node);
      data.nodes.push(node);
      //node_lookup[node.id] = node
      top.dataLookup[node.id] = node

      var ancestors = [node]
      var focus = node
      while (focus.parent_id) {
        if (focus.id == focus.parent_id) {
          console.log('ERROR: ontology term has itself as parent:' + focus.id)
          focus.depth = 1;
          break;
        }
        if (!rawData.term[focus.parent_id]) {
          focus.depth = 1
          break;
        }
        
        focus = rawData.term[focus.parent_id]

        if (focus.depth) { // already calculated depth.
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
        // Don't use ancestor = ancestors.pop(); seems to intefere with data.nodes ???
        var ancestor = ancestors[ancestors.length - ptr - 1] 
        ancestor.depth = focus.depth + ptr + 1
      }
    }

  }

  // Render legend for node coloring
  $("#node_legend").empty();
  var legend_sorted = Object.keys(legend).sort();
  if (legend_sorted.length) 
    $("#node_legend").append('Node colouring<br/>');
  for (var ptr in legend_sorted) {
    var prefix = legend_sorted[ptr];
    var color = prefix_color_mapping[prefix] ? prefix_color_mapping[prefix].color : null;

    $("#node_legend").append(`<div class="legend_color" style="background-color:${color}">${legend[prefix]}</div>
      <div class="legend_item">${prefix}</div>
      <br/>`);
  }

  // To support the idea that graph can work on top-level nodes first
  data.nodes.sort(function(a,b) { return (a.depth - b.depth) })

  if (RENDER_DEPTH != 50) 
    data.nodes = data.nodes.filter(n => (n.depth <= RENDER_DEPTH)) ; // Remove deeper nodes

  // Establish lookup table for all nodes
  data.nodes.forEach((n, idx) => {top.dataLookup[n.id] = n }); 

  var legend = {};

  // 2nd pass does LINKS organized by depth, i.e. allowing inheritance of properties:
  for (var item in data.nodes) {
    var node = data.nodes[item];
    // Size node according to proximity to depth 0.
    node.radius = Math.pow(2, 7-node.depth); // # of levels

    // Any node which has a layout record including custom color, gets group_id = itself.
    if (RENDER_ULO_EDGE) {
      if (top.layout[node.id] && top.layout[node.id].color) {
        node.group_id = node.id;
        legend[node.group_id] = 0;
      }
    }

    if (node.parent_id) {
      const parent = top.dataLookup[node.parent_id];
      if (parent) {
        // Upper level ontology edge color takes cue from parent node
        if (RENDER_ULO_EDGE) {
          if (!node.group_id && parent.group_id) {
            node.group_id = parent.group_id
          }
          legend[parent.group_id] += 1 // This node only counts in parent's category
          var group = top.layout[parent.group_id]
          var color = group ? group.color : node.color;
        }
        else 
          // Color of edge leading to node is color of node's ontology prefix.
          var color = node.color;

        set_link(data.links, parent.id, node.id, '', color, node.radius)

      }
    }
  }

  // Render legend for edge coloring
  $("#edge_legend").empty()
  if (RENDER_ULO_EDGE) {
    var legend_sorted = Object.keys(legend).sort()
    if (legend_sorted.length) 
      $("#edge_legend").append('Edge colouring<br/>')
    for (var ptr in legend_sorted) {
      var group_id = legend_sorted[ptr];
      var group = top.dataLookup[group_id];
      if (group && legend[group_id] > 0) {
        var layout_group = top.layout[parent.group_id]
        var color = top.colors[top.layout[group_id].color];
        $("#edge_legend").append(`<div class="legend_color" style="background-color:${color}">${legend[group_id]}</div>
          <div class="legend_item">${group.label}</div>
          <br/>`
        )
      }

    }
  }

  // Experimental: show 2ndary parents in ORANGE
  // 3rd pass does secondary parent LINKS which could be to shallower nodes
  // than parent, or could be to deeper nodes than parent.  
  // Future: ensure primary parent is always shallowest?
  for (var item in data.nodes) {
    const node = data.nodes[item];

    // Establish 2ndary (multihomed) to other parents
    if (node['rdfs:subClassOf']) 
      for (var ptr = 1; ptr < node['rdfs:subClassOf'].length; ptr ++) {
        const parent = top.dataLookup[node['rdfs:subClassOf'][ptr]];
        if (parent)
          // Not sure why creating a node here causes layout to go wonky.
          //make_node(data.nodes, parent_id, 'Unknown label')
          //
          // "other: true" Signals that this needs to be handled by final pass in
          // depth_iterate() 
          set_link(data.links, parent.id, node.id, '', '#FFA500', node.radius, true );
      }
  }


  if (RENDER_DEPTH != 50) {
    // Chop link content off by depth that user specified.
    // top.dataLookup only has nodes included in graph to given depth at this point.
    data.links = data.links.filter(l => top.dataLookup[l.source] && top.dataLookup[l.target]); 
  }

  data.nodes = preposition_nodes(data.nodes)
  top.builtData = data
  return data
}


function set_node_label(node) {
  /* Makes a clipped short_label for long labels.
  Also ensures id is shown if term has no rdfs:label
  */
  var label = node['rdfs:label'] // was node.label
  if (label) {
    // label derived from node's first few words ...
    node.short_label = label.replace(LABEL_RE, '$1*');
    if (node.short_label.indexOf('*') > 0) 
      node.short_label = node.short_label.split('*',1)[0] + ' ...'
  }
  else {
    node.label = node.id
    //node['rdfs:label'] = node.id
    node.short_label = node.id
  }
}


function set_link(links, source_id, target_id, label = '', color, width, other=false) {
  var link = { 
    source: source_id, 
    target: target_id, 
    label: label,
    color: color, // Hex or string
    width: width,
    other: other
  }
  links.push(link)
  top.dataLookup[source_id].children.push(target_id)
  top.linkLookup[source_id + '-' + target_id] = link

  return link
}

function get_node_radius(node, fancyLayout) {
  /*
  Vary node radius by depth from root of structure.
  */
  if (node.highlight)
    return 20 
  if (node.radius > GRAPH_NODE_RADIUS)
    return node.radius
  return GRAPH_NODE_RADIUS
}

function preposition_nodes(nodes) {
  /* 
  Force graph begins dynamics normally by randomly placing nodes, but 
  this leads to challenging situations where nodes are not even remotely 
  where they should be - and their edge attraction can't get them back
  to local context.
  */
  for (var item in nodes) {
    var node = nodes[item]

    if (!RENDER_GALAXY)
      // Initially fix all nodes
      node.fz = node_depth(node)

    // Give initial x,y hint based on parents
    var layout_node = top.layout[node.id]
    if (layout_node) {
      node.fz = node_depth(node)
      node.fx = layout_node.x;
      node.x = layout_node.x;
      node.fy = layout_node.y;
      node.y = layout_node.y;
    }

/*
    else // Is this working at all? Doesn't seem like it.
      if (node.parent_id) {
        var parent = top.dataLookup[node.parent_id]
        if (parent && parent.x !== undefined) {
          node.x = parent.x +  parseInt(Math.random() * 20-10)
          node.y = parent.y +  parseInt(Math.random() * 20-10)
        }
      }
  */   
  }
  return nodes
}

function node_depth(node) {
  /*
  Returns depth tier calculated as 1000 - depth of node from top of hierarchy in 
  GRAPH_NODE_DEPTH increments, but with first 6 levels having a power relation
  So 0:1024, 1:512, 2:256, 3:128, 4:64, 5: -100, 6: -200, 7: -300 etc.
  */
  base = node.depth < 11 ? 2 ** (10-node.depth) : 0  
  return base - (node.depth- 4) * GRAPH_NODE_DEPTH;
}


function render_node(node) {

  // Displays semi-sphere, then overlays with label text
  var group = new THREE.Group();
  var fancyLayout = layout[node.id] || !RENDER_QUICKER
  var nodeRadius = get_node_radius(node, fancyLayout);

  if (fancyLayout || node.depth < 4) {
    //var geometry = new THREE.CircleGeometry(nodeRadius); // Doesn't provide 3d orientation
    // Set sphere to have fewer facets for rendering speed
    var geometry = new THREE.SphereGeometry(nodeRadius, 6, 4, 0); // (nodeRadius, 6, 4, 0, Math.PI) does 1/2 sphere
    var material = new THREE.MeshBasicMaterial( { color: node.color } );
    var circle = new THREE.Mesh( geometry, material );
    circle.position.set( 0, 0, 0 );
    group.add( circle );
    node.marker = circle;
  }


  // HACK for background sized to text; using 2nd sprite as it always faces camera.
  var spriteMap = new THREE.TextureLoader().load( "img/whitebox.png" );
  var spriteMaterial = new THREE.SpriteMaterial( { map: spriteMap, color: 0x808080 , opacity : 0.5} );


  if (RENDER_LABELS) {

    // The text layer
    var depth_factor = node.depth > 4 ? 2 : 10 - node.depth*2 // 0->2; 1->1.75, 2-> 1.5, 3-> 1.25, 4-> 1.
    var sprite = new SpriteText(node.short_label);
    sprite.color = "#FAEBD7"//node.color;
    sprite.textHeight = 8 * depth_factor;
    sprite.fontSize = 20 // scale takes care of root stuff?
    sprite.position.set( 0, fancyLayout ? 5 : 0, nodeRadius + depth_factor*2 ); //vertical offset.

    // Background layer
    if (fancyLayout) {
      var height = sprite._canvas.height * depth_factor/2
      var width = sprite._canvas.width * depth_factor

      const sprite2 = new THREE.Sprite( spriteMaterial );
      // z index proportional to node globe radius.; -1 to move it behind label
      sprite2.position.set( 0, 5, nodeRadius + depth_factor * 2 ); 
      sprite2.scale.set(width/2, height , 1); // was height = 10
      group.add( sprite2 );
    }
    group.add( sprite ); // Draw label "on top" of sprite? 
  }

  return group;

}

function get_term_prefix(entity_id) {
  return entity_id ? entity_id.split(':')[0].split('#')[0] : null
}

function lookup_url(term_id, label) {
  /* Returns HTML link of full "native" term URI, as well as OLS link.
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
  /* Gets HTML link list of all parents so one can click on them to navigate.
    
  */
  var parent_uris = []
  if (parent_list) {
    for (ptr in parent_list) {
      const parent_id = parent_list[ptr]
      var parent = top.dataLookup[parent_id]
      if (parent) {
        if (parent['rdfs:label'])
          parent_label = parent['rdfs:label']
        else
          parent_label = parent_id
        parent_uris.push(`<span class="focus" onclick="node_focus(top.dataLookup['${parent_id}'])">${parent_label}</span>`)
      }
      // alternate parents may not be in current node graph
      /* else {
        parent_uris.push('unrecognized: ' + parent_id)
      } */
    }
  }
  return parent_uris.length ? parent_uris.join(', ') : null
}


function node_focus(node = {}) {
  /*
    Render details about node in sidebar, and position camera to look at
    node from same vertical level.
  */ 

  parents = get_term_id_urls(node['rdfs:subClassOf'])

  // Label includes term id and links to 
  if (node['rdfs:label'])
    label = node['rdfs:label'] + (node['owl:deprecated'] ? ' <span class="deprecated">deprecated</span>' : '') + '<span class="label_id"> (' + node.id + ' ' +lookup_url(node.id, 'OntoBee' ) + ') </span>'
  else
    label = null
  // <img src="img/link_out_20.png" border="0" width="16">
  $("#parents").html(parents || '<span class="placeholder">parent(s)</span>');
  $("#label").html(label || '<span class="placeholder">label</span>');
  // was node.definition
  $("#definition").html(node['IAO:0000115'] || '<span class="placeholder">definition</span>');

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
  select_child.css('visibility', node.children && node.children.length > 0 ? 'visible':'hidden')
  if (node.children && node.children.length > 0) {
    var option = document.createElement("option");
    select_child.append('<option value="">children ...</option>')

    for (var item in node.children) {
      const child = top.dataLookup[node.children[item]]
      if (child)
        select_child.append(`<option value="${child.id}">${child['rdfs:label']}</option>`)
    }
  }

  // Aim viewport camera at node from z dimension
  // Unfortunately camera animations cause it to loose its "UP" position.  
  // Solution?
  console.log(node)
  if (node.x) {

    // Color assigned here but rendered color isn't actually affected until 
    // AFTER next rebuild of graph/viewport.
    node.color = 'red'; 

    // This sets visual color directly in rendering engine so we don't have to
    // rerender graph as a whole!
    if (node.marker && node.marker.material) {
      node.marker.material.color.setHex(0xFF0000); 
      if (node.depth > 2) {
        node.marker.scale.x = 3
        node.marker.scale.y = 3
        //node.marker.scale.z = 3
      }
    }

    Graph.cameraPosition(
      {x: node.x+500, y: node.y, z: node.z+50}, // new position  + CAMERA_DISTANCE/2 
      node, // lookAt ({ x, y, z })  
      4000  // 4 second transition duration
    )

  }
}


function set_directional_particles(){
  // UNUSED: NOT using force graph's directional particles right now
  // Too much overhead for particles on larger graphs 
  Graph.linkDirectionalParticles( (data.nodes.length > 4000 || RENDER_QUICKER) ? 0 : GRAPH_PARTICLES)

}