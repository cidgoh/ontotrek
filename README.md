OntoTrek is an ontology terminology viewer that takes advantage of 3D graph rendering software. Currently it displays all classes and subclasses but no axioms. There is a variety of ontologies, mainly from OBOFoundry.org, to choose from directly within the application, but one can also enter the URL of an OWL ontology file to view it.  OntoTrek color codes terms by their ontology prefix, or by branches of an upper level ontology they conform to, so that one can visually see which ontologies are at play. It is designed to illustrate the interplay of domain specific ontologies that have been used to build an application ontology.

<img src="docs/images/bfo.png"/>

<img src="docs/images/bfo_eco.png"/>

See it in action at **[http://genepio.org/ontotrek](http://genepio.org/ontotrek)**.

OntoTrek has been developed by the Centre for Infectious Disease Genomics and One Health (CIDGOH) at Simon Fraser University with funding from USDA [NACA 58-8040-8-014-F] and Genome Canada [Project 286GET] to Dr. William Hsiao. Contact Damion Dooley for more information on this project. Contact [Damion Dooley](mailto:damion_dooley@sfu.ca) for more information on this project.

<hr />

## Running this on your computer

OntoTrek can be run immediately in your browser if you have cloned the github repo to your computer.  Since the index.html app page script fetches the selected ontology file in .json format from the data/ subfolder, it requires running a local webserver from the folder it is located in, e.g. 
    
    > python -m http.server

This enables one to open a web browser, usually with URL http://localhost:8000/index.html to run the application.

If you want to look at a particular ontology file that is not in the list, in the web app you can enter a URL of an ontology to be directly retrieved and displayed.

## Building this from scratch

This application for the mostpart relies only on javascript in your browser.  

Issue is as of Jan 26 2020 that 3d-force-graph isn't compiling that simply, so currently in index.html we're including one of its files as a direct reference to a file downloaded from //unpkg.com/3d-force-graph

1) Clone the 3d-force-graph repo separately, and npm install or update it.
If that doesn't work that isn't a problem. The needed files are still there for browserify

However, it loads the 3d-force-graph script which is contained inside bundle.js.  If for development reasons you want to upgrade bundle.js to the latest versions of 3d-force-graph etc. you will need to install the node.js npm environment.  Details of javascript and file generation are in /js/common.js. To summarise:

To update /js/bundle.js which needs latest 3d-force-graph, you need to run 
  browserify.org's "browserify" command. To load it (may need sudo su):

  > npm install -g browserify

Then in /js folder, regenerate bundle.js based on super-basic index.js

  > browserify index.js -o bundle.js

That should do it!
