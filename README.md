OntoTrek is an ontology terminology viewer that takes advantage of 3d graph rendering software. Currently it displays all classes and subclasses but no axioms. We have a variety of ontologies to choose from, mainly from OBOFoundry.org, but one can also enter the URL of an OWL ontology file to view it.  OntoTrek color codes terms by their ontology prefix, or by branches of an upper level ontology they conform to, so that one can visually see which ontologies are at play. It is designed to illustrate the interplay of domain specific ontologies involved in an application ontology.

<img src="docs/images/bfo.png"/>

<img src="docs/images/bfo_eco.png"/>

See it in action at **[http://genepio.org/ontotrek](http://genepio.org/ontotrek)**.

OntoTrek is under development at Hsiao Labs which is associated with the University of British Columbia Department of Pathology and Laboratory Medicine, and with the PHSA Public Health Laboratory at the British Columbia Centre For Disease Control. Contact [Damion Dooley](mailto:damion.dooley@bccdc.ca) for more information on this project.

<hr />

## Running this on your computer

OntoTrek can be run immediately in your browser if you have cloned the github repo to your computer.  Since the index.html app page script fetches the selected ontology file in .json format from the data/ subfolder, it requires running a local webserver from the folder it is located in, e.g. 
    
    > python -m http.server

This enables one to open a web browser, usually with URL http://localhost:8000/index.html to run the application.

If you want to look at a particular ontology file that is not in the list, in the web app you can enter a URL of an ontology to be directly retrieved and displayed.

## Building this from scratch

This application for the mostpart relies only on javascript in your browser.  However, it loads the 3d-force-graph script which is contained inside bundle.js.  If for development reasons you want to upgrade bundle.js to the latest versions of 3d-force-graph etc. you will need to install the node.js npm environment.  Details of javascript and file generation are in /js/common.js. To summarise:

To update 3d-force-graph etc. run this in OntoTrek root folder:
  
  > npm update 

To update /js/bundle.js which needs latest 3d-force-graph, need to run 
  browserify.org's "browserify" command. To load it (may need sudo su):

  > npm install -g browserify
  > npm install three // might need this
  > npm install three-spritetext

Then in /js folder, regenerate bundle.js based on super-basic index.js

  > browserify index.js -o bundle.js

That should do it!
