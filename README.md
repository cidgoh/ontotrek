OntoTrek is an ontology terminology viewer that takes advantage of 3d graph rendering software. Currently it displays all classes and subclasses but no axioms. We have a variety of ontologies to choose from, mainly from OBOFoundry.org, but also provide a python script below for getting OntoTrek to display your own ontology.  It produces a .json representation of your OWL rdf/xml format file.  The software currently supports rdfs:label, IAO definition, and gene ontology oboInOwl#hasSynonym etc. - but we will extend it to work with other popular description and synonym annotations soon. OntoTrek color codes terms by their ontology prefix, or by branches of an upper level ontology they conform to, so that one can visually see which ontologies are at play.
<img src="docs/images/bfo.png"/>

<img src="docs/images/bfo-eco.png"/>

See it in action at **[http://genepio.org/ontotrek](http://genepio.org/ontotrek)**.

OntoTrek is under development at Hsiao Labs which is associated with the University of British Columbia Department of Pathology and Laboratory Medicine, and with the PHSA Public Health Laboratory at the British Columbia Centre For Disease Control. Contact [Damion Dooley](mailto:damion.dooley@bccdc.ca) for more information on the project.

<hr />

## Running this on your computer

OntoTrek can be run immediately in your browser if you have cloned this repo.  Since the index.html app page script fetches the selected ontology file in .json format from the data/ subfolder, it requires running a local webserver from the folder it is located in, e.g. 
    
> python -m http.server

If you want to look at a particular ontology file that is not in the list, currently you need to do two things:

1) Run the ontofetch.py program (downloadable from https://github.com/Public-Health-Bioinformatics/ontofetch) on a local .owl file in rdf/xml format, (or a remote URL of the same format) to produce a simplified .json version of your ontology.  

2) adjust the index.html menu of ontology files to include your desired ontology.  Then run the application.

## Building this from scratch

This application for the mostpart relies only on javascript in your browser.  However, to update the 3d-force-graph code to the latest version, which one might want to do for development reasons, requires activating the node.js npm environment.  Details of javascript and file generation are in /js/common.js. To summarise:

  To update 3d-force-graph run this in ontotrek root folder:
  
  > npm update 

  To update /js/bundle.js which needs latest 3d-force-graph, need to run 
  browserify.org's "browserify" command. To load it (may need sudo su):

  > npm install -g browserify
  > npm install uniq 

  Then in /js folder, regenerate bundle.js based on super-basic index.js

  > browserify index.js -o bundle.js

The json data file being examined in /data/ is generated by ontofetch.py
from an OWL ontology file.
