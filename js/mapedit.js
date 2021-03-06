// mapedit.js
//
// Map/Floorplan Editing interface
//

'use strict';
//=============================================================
//                          SVG.JS
//=============================================================

SVG.on(document, 'DOMContentLoaded', function () {
    // if user has made any changes, ask before exiting current page

    /*$(window).bind('beforeunload', function(){
      if (changesMade === true) return 'Are you sure you want to leave?';
    });*/
    var drawing = new SVG('svgGrid').size("100%", "100%").panZoom({
        zoomMin: 0.5,
        zoomMax: 2,
        zoomFactor: 0.1
    });
    /* Temporary stack for storing all user's floor plan data.
    ** Each index consists of an SVG object.
    */

    var floorPlanSvg = [],        // stores SVG nodes
    initialFloorPlanData = [],    // stores initial data from database (room_ID as keys)
    nodeLocations = {},           // stores node SVG objects with node_ID as keys
    currentFloorPlan = [],        // stores the current state of floorplan as user makes changes (room_ID as keys)
    floorID = "0",
    floorPlanGroups = {},           // each grouped room is stored with room_ID as keys
    loaded = false,
    changesMade = false;

    drawing.on('panEnd', function (ev) {
        var vbX = drawing.viewbox().x;
        var vbY = drawing.viewbox().y;
        console.log(drawing.viewbox());
    }); 

    // Import floorplan function

    var initialize = function initialize() {

        // Empty floorPlan array of any previous/excess data
        initialFloorPlanData = []; // Checks if floorplan is loaded

        if (loaded === true) {
            drawing.clear();
            floorPlanSvg = [];
        } // if floorplan has not been loaded


        $.ajax({
            method: 'GET',
            url: String(_config.api.inloApiUrl) + '/v1/floorplan',
            headers: {
            Authorization: 'Bearer ' + getAuth("Authorization")
            },
            success: completeRequest,
            error: function ajaxError(jqXHR, textStatus, errorThrown) {
            console.error('Error requesting devices: ', textStatus, ', Details: ', errorThrown);
            console.error('Response: ', jqXHR.responseText);
            }
        });

        function completeRequest(result) {
            
            console.log('Response received from API: ', result); // if there are no floorplans

            if (result.length === 0) {
                console.log("here");
                $("#map-view-text").append("Map view not yet available");
            } else {
                currentFloorPlan = result;
                initialFloorPlanData = JSON.stringify(result);
                // Clear floorPlanSvg
                floorPlanSvg = [];

                // redraw rooms groups and reload floorPlanSvg
                for (let i = 0; i < currentFloorPlan.length; i++) {

                        if (currentFloorPlan[i].rooms.length > 0) {

                            // iterate over rooms
                            for (let j = 0; j < currentFloorPlan[i].rooms.length; j++) {

                                let room = drawing.rect(currentFloorPlan[i].rooms[j].width, currentFloorPlan[i].rooms[j].height)
                                    .attr({
                                        x: currentFloorPlan[i].rooms[j].x,
                                        y: currentFloorPlan[i].rooms[j].y,
                                        fill: 'white',
                                        stroke: '#E3E3E3',
                                        'stroke-width': 3
                                    }) 

                                // change created room's id to roomID from database
                                room.node.id = currentFloorPlan[i].rooms[j].roomID;
                                // store roomID in var
                                let room_ID = room.node.id;

                                floorPlanSvg.push(room);   


                                let groupID = room_ID + "group";
                                let roomGroup = drawing.group().addClass(groupID);
                                roomGroup.add(room.addClass(groupID));

                                // iterate over nodes
                                if (currentFloorPlan[i].rooms[j].hasOwnProperty("nodes")) {
                                    for (let k = 0; k < currentFloorPlan[i].rooms[j].nodes.length; k++) {

                                        let node_ID = currentFloorPlan[i].rooms[j].nodes[k].nodeID;
                                        let node_x = currentFloorPlan[i].rooms[j].nodes[k].x;
                                        let node_y = currentFloorPlan[i].rooms[j].nodes[k].y;

                                        // draw and store device object initializer in deviceLocations object
                                        nodeLocations[node_ID] = {};
                                        nodeLocations[node_ID]["Icon"] = drawing.image("images/inlo-device.png", 15, 10);
                                        nodeLocations[node_ID]["Icon"].attr({
                                                                    x: node_x,
                                                                    y: node_y,
                                                                    fill: "white",
                                                                    stroke: "#E3E3E3",
                                                                    id: node_ID})

                                        // add room node to room group
                                        roomGroup.add(nodeLocations[node_ID]["Icon"].addClass(groupID));

                                    }
                                }
                                floorPlanGroups[room_ID] = roomGroup; 
                            }
                        } else {continue;}
              
                } // end FOR
            } // end IF

          // set loaded to true to prevent excess loading
          loaded = true;
        } // end completeRequest
    }; // END initialize()


    initialize();


    var get_room_data = function get_room_data(room_ID) {

        for (var i = 0; i < currentFloorPlan.length; i++) {
            for (var j = 0; j < currentFloorPlan[i].rooms.length; j++) {
                if (currentFloorPlan[i].rooms[j].roomID === room_ID) { 
                    return currentFloorPlan[i].rooms[j];
                }
            }
        }
    }

    var compute_node_xy = function compute_node_xy(room_ID, node_ID) {
        var node_x,
            node_y
            vbX = drawing.viewbox().x,
            vbY = drawing.viewbox().y,
            vbZoom = drawing.viewbox().zoom;

        // current coordinates of room
        var room_x = document.getElementById(room_ID).instance.x() - document.getElementById(room_ID).instance.transform().x,
            room_y = document.getElementById(room_ID).instance.y() - document.getElementById(room_ID).instance.transform().y,
        // current dimensions of room
            height = document.getElementById(room_ID).instance.height(),
            width = document.getElementById(room_ID).instance.width(); 
    
        // Iterate over floor plans determine which node has the requested node_ID
        for (var i = 0; i < currentFloorPlan.length; i++) {
            // iterate over rooms
            for (var j = 0; j < currentFloorPlan[i].rooms.length; j++) {
                // if room has a nodes property
                if (currentFloorPlan[i].rooms[j].hasOwnProperty("nodes")) {
                    // iterate over nodes
                    for (var k = 0; k < currentFloorPlan[i].rooms[j].nodes.length; k++) {
                        if (node_ID === currentFloorPlan[i].rooms[j].nodes[k].nodeID) {
                            node_x = currentFloorPlan[i].rooms[j].nodes[k].x,
                            node_y = currentFloorPlan[i].rooms[j].nodes[k].y;
                            console.log(node_x_frac, node_y_frac)
                        } else {
                            continue;
                        }
                    }
                } else {
                    continue;
                }
            }
        }

        // use raw node coordinates to compute actual node coordinates
        node_x = node_x + room_x,
        node_y = node_y + room_y;
        return [node_x, node_y];

    }; // END compute_node_xy()

  // ===============================
  //         Cancel Changes
  // ================================
    var cancelChanges = function cancelChanges() {
    
        // prompt user
        var userResponse = confirm("Are you sure you want to cancel changes?"); // if user clicks OK

        if (userResponse == true) {

            // update currentFloorPlan
            currentFloorPlan = JSON.parse(initialFloorPlanData); // clear rooms groups

            for (var i = 0; i < floorPlanSvg.length; i++) {
                var groupId = floorPlanSvg[i].node.parentElement.id;
                $("#" + String(groupId)).remove();
            } // Clear floorPlanSvg


            floorPlanSvg = []; // redraw rooms groups and reload floorPlanSvg

            for (var _i = 0; _i < currentFloorPlan.length; _i++) {
                if (currentFloorPlan[_i].rooms.length > 0) {

                    // iterate over rooms
                    for (var j = 0; j < currentFloorPlan[_i].rooms.length; j++) {

                        var room = drawing.rect(currentFloorPlan[_i].rooms[j].width, currentFloorPlan[_i].rooms[j].height).attr({
                            x: currentFloorPlan[_i].rooms[j].x,
                            y: currentFloorPlan[_i].rooms[j].y,
                            fill: 'white',
                            stroke: '#E3E3E3',
                            'stroke-width': 3
                        }); // change created room's id to roomID from database

                        room.node.id = currentFloorPlan[_i].rooms[j].roomID; // store roomID in var

                        var room_ID = room.node.id;
                        floorPlanSvg.push(room);
                        var groupID = room_ID + "group";
                        var roomGroup = drawing.group().addClass(groupID);
                        roomGroup.add(room.addClass(groupID)); // iterate over nodes

                        if (currentFloorPlan[_i].rooms[j].hasOwnProperty("nodes")) {
                            for (var k = 0; k < currentFloorPlan[_i].rooms[j].nodes.length; k++) {
                                var node_ID = currentFloorPlan[_i].rooms[j].nodes[k].nodeID;
                                var node_x = currentFloorPlan[_i].rooms[j].nodes[k].x;
                                var node_y = currentFloorPlan[_i].rooms[j].nodes[k].y; // draw and store device object initializer in deviceLocations object

                                nodeLocations[node_ID] = {};
                                nodeLocations[node_ID]["Icon"] = drawing.image("images/inlo-device.png", 15, 10);
                                nodeLocations[node_ID]["Icon"].attr({
                                    x: node_x,
                                    y: node_y,
                                    fill: "white",
                                    stroke: "#E3E3E3",
                                    id: node_ID
                                }); // add room node to room group

                                roomGroup.add(nodeLocations[node_ID]["Icon"].addClass(groupID));
                            }
                        }

                        floorPlanGroups[room_ID] = roomGroup;
                    }
                } else {
                    continue;
                }
            }//window.location.href = 'mapedit.html'

            /*// iterate over floorPlanSVG rooms
            for (var i = 0; i < floorPlanSvg.length; i++) {
               // if room has just been drawn
              if (floorPlanSvg[i]._event !== null) {
                   // store groupID
                  var groupId = floorPlanSvg[i].node.parentElement.id;
                   // remove room from svg display
                  $("#"+String(groupId)).remove();
                   // update floorPlanSvg
                  floorPlanSvg.splice(i, 1)
                    // update floorPlanGroups
                  //floorPlanGroups.splice(1, )
                   console.log("floorPlanSvg", floorPlanSvg);
                  console.log("currentFloorPlan", currentFloorPlan);
                  console.log("initialFloorPlanData", initialFloorPlanData);
                  console.log("floorPlanGroups", floorPlanGroups);
              }
            }*/

        } // if user clicks CANCEL, everything remains as is.

    }; // END cancelChanges()


    // ===============================
    //         SAVE Changes
    // ================================
    var save_floorplan = function save_floorplan(update_key) {

        for (var i = 0; i < currentFloorPlan.length; i++) {

            var floor_ID = currentFloorPlan[i].floorID,
                input_rooms = currentFloorPlan[i].rooms,
                input_body = {
                    "rooms": input_rooms
                };

            $.ajax({
                method: 'PATCH',
                url: String(_config.api.inloApiUrl) + '/v1/floorplan/' + floor_ID,
                headers: {
                    Authorization: 'Bearer ' + getAuth("Authorization")
                },
                data: input_body,
                success: completeRequest,
                error: function ajaxError(jqXHR, textStatus, errorThrown) {
                    console.error('Error requesting devices: ', textStatus, ', Details: ', errorThrown);
                    console.error('Response: ', jqXHR.responseText);
                    alert('An error occured when requesting devices:\n' + jqXHR.responseText);
                }
            });
        }

        function completeRequest(result) {

            // Get the modal
            var modal = document.getElementById('saveModal');

            // Get the button that opens the modal
            var btn = document.getElementById("myBtn");

            // Get the <span> element that closes the modal
            var span = document.getElementsByClassName("close")[0];

            // When the user clicks on the button, open the modal
            modal.style.display = "block";

            // When the user clicks on <span> (x), close the modal
            span.onclick = function () {
                modal.style.display = "none";
            };

            // When the user clicks anywhere outside of the modal, close it
            window.onclick = function (event) {
                if (event.target == modal) {
                    modal.style.display = "none";
                }
            };
        }

        initialFloorPlanData = JSON.stringify(currentFloorPlan);
    }; // END save_floorplan()


    // ===============================
    //         CREATE FLOORPLAN
    // ================================
    var create_floorplan = function create_floorplan() {

        $.ajax({
            method: 'POST',
            url: String(_config.api.inloApiUrl) + '/v1/floorplan',
            headers: {
                Authorization: 'Bearer ' + getAuth("Authorization")
            },
            success: completeRequest,
            error: function ajaxError(jqXHR, textStatus, errorThrown) {
                console.error('Error requesting devices: ', textStatus, ', Details: ', errorThrown);
                console.error('Response: ', jqXHR.responseText);
                alert('An error occured when requesting devices:\n' + jqXHR.responseText);
            }
        });

        function completeRequest(result) {
          console.log("result is:", result);
        }

        initialFloorPlanData = JSON.stringify(currentFloorPlan);
    }; // END create_floorplan()


    // ===============================
    //         DELETE FLOORPLAN
    // ================================
    var delete_floorplan = function delete_floorplan(currentFloorplan) {

        $.ajax({
            method: 'DELETE',
            url: String(_config.api.inloApiUrl) + '/v1/floorplan/' + floorID,
            headers: {
                Authorization: 'Bearer ' + getAuth("Authorization")
            },
            data: currentFloorplan,
            success: completeRequest,
            error: function ajaxError(jqXHR, textStatus, errorThrown) {
                console.error('Error requesting devices: ', textStatus, ', Details: ', errorThrown);
                console.error('Response: ', jqXHR.responseText);
                alert('An error occured when requesting devices:\n' + jqXHR.responseText);
            }
        });

        function completeRequest(result) {
          console.log("result is:", result);
        }

        initialFloorPlanData = JSON.stringify(currentFloorPlan);
    }; // END delete_floorplan()


    // =================================================================
    //                 buttonSVG buttons functionailty
    // =================================================================

    // Redirect user back to dashboard on click
    $("#done-btn").click(function () {
        window.location.href = 'dashboard.html';
    }); // Cancel user changes

    $("#cancel-btn").click(function () {
        cancelChanges();
    }); // Save user changes

    $("#save-btn").click(function () {
        save_floorplan(currentFloorPlan);
    });

    // =================================================================
    //                  buttonSVG buttons functionailty END
    // =================================================================




    // =================================================================
    //                      HTML buttons functionality
    // =================================================================

    // *****************
    //   PRINT DATA 
    // *****************
    $("#print-data").on('click', function () {
        console.log("here");
        console.log("currentFloorPlan", currentFloorPlan);
        console.log("initialFloorPlanData", initialFloorPlanData);
        console.log("floorPlanSvg", floorPlanSvg);
        console.log("floorPlanGroups", floorPlanGroups);
    });

    // *****************
    //   DELETE ROOMS
    // *****************

    $("#delete-rooms").on('click', function () {
        // make all rooms undraggable
        for (var key in floorPlanGroups) {
            floorPlanGroups[key].node.children[0].instance.selectize(false).resize('stop');
        }

        for (var i = 0; i < floorPlanSvg.length; i++) {
            var room_ID = floorPlanSvg[i].node.id;
            $('#' + room_ID).on('click', function (e) {
                // update room_ID
                room_ID = e.target.id;

                // remove all event handlers from all rooms
                for (var i = 0; i < floorPlanSvg.length; i++) {
                    $("#" + floorPlanSvg[i].node.id).off("click");
                }

                // ITERATE over floors
                for (var i = 0; i < currentFloorPlan.length; i++) {

                    // iterate over rooms until you find room with roomID == room_ID
                    // then delete that room 
                    for (var j = 0; j < currentFloorPlan[i].rooms.length; j++) {
                        if (currentFloorPlan[i].rooms[j].roomID === room_ID) {
                            // if room has any nodes
                            if (currentFloorPlan[i].rooms[j].hasOwnProperty("nodes")) {
                                alert("Cannot delete room. Node attached.");
                            } else {
                                // remove room instance from SVG
                                this.instance.remove();

                                // update currentFloorPlan
                                currentFloorPlan[i].rooms.splice(j, 1);

                                // update floorPlanSvg
                                floorPlanSvg.splice(floorPlanSvg.indexOf(i), 1);

                                // update floorPlanGroups
                                delete floorPlanGroups[room_ID];
                            }
                        }
                    }
                }

                changesMade = true;
            }); // end onclick
        }
    }); // end delete-rooms onclick

    // *****************
    //    DRAG ROOM
    // *****************

    $("#drag").on('click', function (e) {

        for (var key in floorPlanGroups) {
            // stop resizing for all rooms
            floorPlanGroups[key].node.children[0].instance.selectize(false).resize('stop'); // make all room groups draggable

            floorPlanGroups[key].draggable({
                snapToGrid: 8
            }); // unbind event listener

            floorPlanGroups[key].off('dragend'); // After the room has been dragged

            floorPlanGroups[key].on("dragend", function (e) {
                e.preventDefault(); // Grab room_ID

                var room_ID = e.target.children["0"].id; 

                // Manually adjust room's new x/y coordinates
                var new_room_x = e.target.firstChild.instance.x() + e.target.instance.transform().x,
                    new_room_y = e.target.firstChild.instance.y() + e.target.instance.transform().y;

                // If room has nodes in it, Adjust node positions
                if (e.target.children.length > 1) {
                    // Get node coordinates
                    for (var n = 1; n < e.target.children.length; n++) {
                        for (var i = 0; i < currentFloorPlan.length; i++) {
                            for (var j = 0; j < currentFloorPlan[i].rooms.length; j++) {
                                if (currentFloorPlan[i].rooms[j].roomID === room_ID) { 
                                    var current_x = currentFloorPlan[i].rooms[j].nodes[n-1].x,
                                        current_y = currentFloorPlan[i].rooms[j].nodes[n-1].y;
                                }
                            }
                        }

                        var new_node_x = current_x + e.target.instance.transform().x,
                            new_node_y = current_y + e.target.instance.transform().y;
                        // Manually adjust node's new x/y coordinates
                        $("#" + e.target.childNodes[n].id).removeAttr("transform");
                        $("#" + e.target.children[n].id).attr("x", String(new_node_x));
                        $("#" + e.target.children[n].id).attr("y", String(new_node_y));

                        // Update currentFloorPlan 
                        for (var i = 0; i < currentFloorPlan.length; i++) {
                            for (var j = 0; j < currentFloorPlan[i].rooms.length; j++) {
                                if (currentFloorPlan[i].rooms[j].roomID === room_ID) { 
                                    currentFloorPlan[i].rooms[j].nodes[n-1].x = new_node_x;
                                    currentFloorPlan[i].rooms[j].nodes[n-1].y = new_node_y;
                                }
                            }
                        }
                    }
                }


                // Remove transform from svg, and manually update room location
                $("#" + e.target.id).removeAttr("transform");
                $("#" + e.target.children[0].id).attr("x", new_room_x);
                $("#" + e.target.children[0].id).attr("y", new_room_y);


                // update currentFloorPlan
                for (var i = 0; i < currentFloorPlan.length; i++) {
                    for (var j = 0; j < currentFloorPlan[i].rooms.length; j++) {
                        if (currentFloorPlan[i].rooms[j].roomID === room_ID) {
                            currentFloorPlan[i].rooms[j].x = new_room_x;
                            currentFloorPlan[i].rooms[j].y = new_room_y;
                        }
                    }
                } // END update currentFloorPlan


                changesMade = true;
            }); // END dragend
        } // END for loop

    }); // end drag onclick

    // *****************
    //     DRAG NODE
    // *****************
    $("#drag-node").on('click', function(e) {

        for (var key in floorPlanGroups) {

            // stop resizing for all rooms
            floorPlanGroups[key].node.children[0].instance.selectize(false).resize('stop')

            // make all nodes in the rooms draggable
            for (var i = 1; i < floorPlanGroups[key].node.children.length; i++) {
                floorPlanGroups[key].node.childNodes[i].instance.draggable({snapToGrid: 10})

                // unbind event listener
                floorPlanGroups[key].node.childNodes[i].instance.off('dragend')

                // After the node has been dragged
                floorPlanGroups[key].node.childNodes[i].instance.on("dragend", function(e){

                    // Grab room_ID
                    var room_ID = e.target.instance.node.parentNode.firstChild.id;

                    // Grab SVG coordinates so we can subtract from element coordinates 
                    // to give us the actual coordinates on the SVG document.
                    var svgX = document.getElementById(drawing.node.id).instance.x(),
                        svgY = document.getElementById(drawing.node.id).instance.y();

                  
                    var node_ID = e.target.instance.node.id;

                    // Get new node coordinates
                    let new_node_x = document.getElementById(node_ID).instance.x() - svgX,
                        new_node_y = document.getElementById(node_ID).instance.y() - svgY;

                    // update currentFloorPlan nodes
                    for (var i = 0; i < currentFloorPlan.length; i++) {
                        // iterate over rooms
                        for (var j = 0; j < currentFloorPlan[i].rooms.length; j++) {
                            // if room has a node
                            if (currentFloorPlan[i].rooms[j].hasOwnProperty("nodes")) {
                                // iterate over nodes
                                for (var k = 0; k < currentFloorPlan[i].rooms[j].nodes.length; k++) {
                                    if (currentFloorPlan[i].rooms[j].nodes[k].nodeID === node_ID) {
                                        currentFloorPlan[i].rooms[j].nodes[k].x = new_node_x;
                                        currentFloorPlan[i].rooms[j].nodes[k].y = new_node_y;
                                    }
                                }
                            }
                        }
                    }
                  

                });
        }

            changesMade = true;
        }
    });


    // *****************
    //    RESIZE ROOM
    // *****************

    $("#resize").on('click', function () {

        // make all rooms undraggable
        for (var key in floorPlanGroups) {
            floorPlanGroups[key].draggable(false);
        } // loop through elements in group


        $('#svgGrid g rect').each(function () {
            this.instance.selectize().resize();
            $("#" + this.instance.node.id).off('resizedone'); // when resizing is done

            $("#" + this.instance.node.id).on('resizedone', function (e) {
                var node_count;

                // get room_ID
                var room_ID = e.target.id;
                console.log(e.target.attributes)


                // Get new coordinates and dimensions of the resized room
                var new_room_x = e.target.attributes.x.value, 
                    new_room_y = e.target.attributes.y.value;

                var new_room_width = e.target.attributes.width.value,
                    new_room_height = e.target.attributes.height.value; 

                // update currentFloorPlan with new coordinates, width and height
                for (var i = 0; i < currentFloorPlan.length; i++) {
                    for (var j = 0; j < currentFloorPlan[i].rooms.length; j++) {
                        if (currentFloorPlan[i].rooms[j].roomID === room_ID) {
                        
                            console.log(currentFloorPlan[i].rooms[j].hasOwnProperty("nodes"));

                            /* // Repositioning Node after room resize - turned off for now due to lack of fractional node position values 
                            if (currentFloorPlan[i].rooms[j].hasOwnProperty("nodes")) {
                                for (var k = 0; k < currentFloorPlan[i].rooms[j].nodes.length; k++) {
                                    // get node_ID
                                    var node_ID = currentFloorPlan[i].rooms[j].nodes[k].nodeID,
                                    
                                        // compute node fractions from currentFloorPlan
                                        room_data = get_room_data(room_ID)

                                        for (var n = 0; n < room_data.nodes.length; n++) {
                                            if (room_data.nodes[n].nodeID === node_ID) {
                                                var node_w = room_data.nodes[n].x - room_data.x;
                                                var node_h = room_data.nodes[n].y - room_data.y;

                                                var x_frac = node_w / room_data.width;
                                                var y_frac = node_h / room_data.height;
                                            }
                                        } 

                                        // compute new node coordinates using fractional values
                                        var new_node_x = Number(new_room_x) + Number(x_frac*new_room_width),
                                            new_node_y = Number(new_room_y) + Number(y_frac*new_room_width);

                                        // Move target node to new node location
                                        nodeLocations[node_ID].Icon.animate().move(new_node_x, new_node_y);

                                        // update currentFloorPlan node coordinates
                                        currentFloorPlan[i].rooms[j].nodes[k].x = new_node_x
                                        currentFloorPlan[i].rooms[j].nodes[k].y = new_node_y
                                }
                            } */

                            // update currentFloorPlan room coordinates and dimensions
                            currentFloorPlan[i].rooms[j].x = new_room_x;
                            currentFloorPlan[i].rooms[j].y = new_room_y;
                            currentFloorPlan[i].rooms[j].width = new_room_width;
                            currentFloorPlan[i].rooms[j].height = new_room_height;
                        }
                    }
                }
            });
            changesMade = true;
        });
    }); // end resize onclick


    // *****************
    //     ADD ROOM
    // *****************

    $("#draw-room").on('click', function () {

        // pause panZoom
        drawing.panZoom(false); // make all rooms undraggable and unresizable

        for (var key in floorPlanGroups) {
            floorPlanGroups[key].node.children[0].instance.selectize(false).resize('stop');
        } // create room and store in variable


        var room, room_ID;

        // Draw rectangle while mouse is held down
        drawing.on('mousedown', function (e) {
            room = drawing.rect();
            room.draw(e).attr({
                fill: 'white',
                stroke: '#E3E3E3',
                'stroke-width': 3
            });
        }); // Stop drawing on mouse up and push shape to floorPlan stack

        drawing.on('mouseup', function (e) {
            // stop drawing
            room.draw('stop');

            // unbind drawing button from mouse events
            drawing.off();
            var room_ID, timestamp;
            var x = room.node.attributes[3].nodeValue,
                y = room.node.attributes[4].nodeValue,
                floor = 1,
                width = room.node.attributes[1].nodeValue,
                height = room.node.attributes[2].nodeValue;

            // calling room API to generate room ID and timestamp
            $.ajax({
                method: 'POST',
                url: String(_config.api.inloApiUrl) + '/v1/room',
                headers: {
                    Authorization: 'Bearer ' + getAuth("Authorization")
                },
                success: completeRequest,
                error: function ajaxError(jqXHR, textStatus, errorThrown) {
                    console.error('Error requesting devices: ', textStatus, ', Details: ', errorThrown);
                    console.error('Response: ', jqXHR.responseText);
                }
            });

            function completeRequest(result) {
                // creates room ID and time room was drawn
                room_ID = result.roomID;
                timestamp = result.timestamp;
                var groupID = room_ID + "group",
                    roomGroup = drawing.group().addClass(groupID),
                    room_data = {
                        "rooms": [{
                        "roomID": room_ID,
                            "roomName": "Kitchen",
                            "floor": floor,
                            "x": x,
                            "y": y,
                            "width": width,
                            "height": height
                        }]
                    };
                console.log(currentFloorPlan)
                if (currentFloorPlan.length == 0 ) {
                    create_floorplan()
                } else {
                    currentFloorPlan[floorID].rooms.push(room_data.rooms[0]);
                }
                floorPlanSvg.push(room);
                roomGroup.add(floorPlanSvg[floorPlanSvg.length - 1].addClass(groupID));
                floorPlanGroups[room_ID] = roomGroup;
            }

            changesMade = true;

            // resume panZoom
            drawing.panZoom({
                zoomMin: 0.5,
                zoomMax: 2,
                zoomFactor: 0.1
            });
        }); // end mouseup event
    }); // end draw-room onclick

    // *******************************************
    //     DRAW DOOR (WONT BE TOUCHED FOR NOW)
    // *******************************************

    $("#draw-door").on('click', function () {

        // Deselect all rooms
        for (var i = 0; i < floorPlanSvg.length; i++) {
            floorPlanSvg[i].selectize(false).resize('stop').draggable(false);
        }

        // ungroup elements
        for (var i = 0; i < floorPlanGroups.length; i++) {
            floorPlanGroups[i].ungroup(drawing);
            console.log("floorPlan[i] ungrouped", floorPlanGroups[i]);
        }

        // grab SVG coords so we can subtract them from mouse
        // coords to give us actual coords on SVG
        var svgX = document.getElementById(drawing.node.id).getBoundingClientRect().x,
            svgY = document.getElementById(drawing.node.id).getBoundingClientRect().y;

        function addDoor(event) {
            var mouseX = event.clientX - svgX,
                mouseY = event.clientY - svgY,
                doorLength = 20,
                clickMarginError = 10;


            /* The purpose of this for loop is to go through each room
            *  in the floorPlan stack and determine exactly which wall
            *  the user clicked so that a door can be drawn and aligned
            *  properly on that wall of the room. 
            */

            for (var i = 0; i < floorPlanSvg.length; i++) {
                // Declare variables for room attributes: X, Y, Width, Height
                var roomX = Number(floorPlanSvg[i].node.attributes[3].nodeValue),
                    roomY = Number(floorPlanSvg[i].node.attributes[4].nodeValue),
                    roomWidth = Number(floorPlanSvg[i].node.attributes[1].nodeValue),
                    roomHeight = Number(floorPlanSvg[i].node.attributes[2].nodeValue);

                // Determine if user clicked the [LEFT] wall
                if (mouseX < roomX + clickMarginError && mouseY > roomY + doorLength / 2 && 
                mouseX > roomX - clickMarginError && mouseY < roomY + roomHeight - doorLength / 2 
                ) {
                    var door = drawing.line(mouseX, mouseY - doorLength / 2, mouseX, mouseY + doorLength / 2).stroke({
                        color: '#888888',
                        width: 3
                    });

                    // Set x1, x2 coordinates to that of the room to align door with room wall
                    door.node.attributes[3].nodeValue = Number(floorPlanSvg[i].node.attributes[3].nodeValue);
                    door.node.attributes[1].nodeValue = Number(floorPlanSvg[i].node.attributes[3].nodeValue);
                }
                // Determine if user clicked the [TOP] wall
                else if (mouseY < roomY + clickMarginError && mouseX > roomX + doorLength / 2 &&
                mouseY > roomY - clickMarginError && mouseX < roomX + roomWidth - doorLength / 2) {
                    var door = drawing.line(mouseX - doorLength / 2, mouseY, mouseX + doorLength / 2, mouseY).stroke({
                        color: '#888888',
                        width: 3
                    });

                    // Set y1, y2 coordinates to that of the room to align door with room wall
                    door.node.attributes[2].nodeValue = Number(floorPlanSvg[i].node.attributes[4].nodeValue);
                    door.node.attributes[4].nodeValue = Number(floorPlanSvg[i].node.attributes[4].nodeValue);
                }
                // Determine if user clicked the [RIGHT] wall
                else if (mouseX < roomX + roomWidth + clickMarginError && mouseY > roomY + doorLength / 2 && 
                mouseX > roomX + roomWidth - clickMarginError && mouseY < roomY + roomHeight - doorLength / 2) {
                    var door = drawing.line(mouseX, mouseY - doorLength / 2, mouseX, mouseY + doorLength / 2).stroke({
                        color: '#888888',
                        width: 3
                    });

                    // Set x1, x2 coordinates to that of the room to align door with room wall
                    door.node.attributes[3].nodeValue = Number(floorPlanSvg[i].node.attributes[3].nodeValue) + roomWidth;
                    door.node.attributes[1].nodeValue = Number(floorPlanSvg[i].node.attributes[3].nodeValue) + roomWidth;
                }
                // Determine if user clicked the [BOTTOM] wall
                else if (mouseY < roomY + roomHeight + clickMarginError && mouseX > roomX + doorLength / 2 && 
                mouseY > roomY + roomHeight - clickMarginError && mouseX < roomX + roomWidth - doorLength / 2) {
                        var door = drawing.line(mouseX - doorLength / 2, mouseY, mouseX + doorLength / 2, mouseY).stroke({
                            color: '#888888',
                            width: 3
                        });

                        // Set y1, y2 coordinates to that of the room to align door with room wall
                        door.node.attributes[2].nodeValue = Number(floorPlanSvg[i].node.attributes[4].nodeValue) + roomHeight;
                        door.node.attributes[4].nodeValue = Number(floorPlanSvg[i].node.attributes[4].nodeValue) + roomHeight;
                } else {
                    continue;
                }
            } // end FOR
        } // end addDoor()

        document.addEventListener("click", addDoor);
    }); // end draw-door onclick


    // =================================================================
    //                    HTML buttons functionality END
    // =================================================================
}); // end SVG DomContentLoaded


$(document).ready(function () {

    // Redirect user if logged out
    if (getAuth("Authorization").length === 0) {
        window.location.href = "signin.html";
    } else {
        document.getElementsByTagName("html")[0].style.visibility = "visible";
    }

    // hide listed items
    $("#items-listed-div").hide();
    $("#dropdown-sort-div").hide();

    // home icon click event
    $(".home-icon").click(function () {
        var homeIconClass = document.getElementsByClassName("home-icon");
        var homeIconId = document.getElementById("home-icon-svg");

        for (var i = 0; i < $(".home-icon").length; i++) {
            homeIconClass[i].attributes[4].nodeValue = "#00D9A7";
        }

        homeIconId.style.borderBottom = "6px solid #00D9A7";
        homeIconId.style.paddingBottom = ".6em";
    });

    // drop down menu click event
    $("#dropdown-btn").click(function () {
        $("#dropdown-menu").toggle(500);
    }); // Prompt user if they're sure they want to leave on page exit

    /*$(window).bind('beforeunload', function(){
        if (currentFloorPlan === initialFloorPlanData) {
            return 'Are you sure you want to leave?';
        }
    });*/

    /*$("#sort-selection").html($("#sort-selection option").sort(function (a, b) {
        return a.text == b.text ? 0 : a.text < b.text ? -1 : 1
    }))*/
});
