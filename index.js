const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const cors = require('cors')({origin: true});
admin.initializeApp();
var database = admin.database();

/**
* Here we're using Gmail to send 
*/
let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'alexandrefrancoislevy@gmail.com',
        pass: 'memotechnique'
    }
});

exports.sendMail = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
      
        // getting dest email by query string
        const dest = req.query.dest;
        const obj= req.query.object;
        const content = req.query.content;

        const mailOptions = {
            from: 'Alexandre Levy <alexandrefrancoislevy@gmail.com>', // Something like: Jane Doe <janedoe@gmail.com>
            to: dest,
            subject: obj, // email subject
            html: content // email content in HTML
        };
  
        // returning result
        return transporter.sendMail(mailOptions, (erro, info) => {
            if(erro){
                return res.send(erro.toString());
            }
            return res.send('Sended');
        });
    });    
});
exports.Next = functions.https.onRequest((req, res) => {
      
    const dest = req.query.dest;
    var meetingList = database.ref("production/meetingsList/"+dest);
    var reg;
    

    
   /* play.once("value").then(function(snapshot) {
      console.log('coucou!');
      resume=snapshot.child("currentPointIndex").val();
      console.log(resume);
      
    }, function (error) {
      console.log("Error: " + error.code);
    });*/
    //database.ref("production/meetings").child(dest).child("runtime").update({ currentPointIndex : 2 });
    return meetingList.once("value").then(function(snapshot) {
        reg = snapshot.val();
        var play= database.ref("production/meetings/"+reg+"/runtime/currentPointIndex");
        var child= database.ref("production/meetings/"+reg+"/agenda/pointsOrder");
        var nb = 0;
        var resume=0;
        child.once("value").then(function(snapshot) {
            console.log('hello!');
            nb=snapshot.numChildren();
        }, function (error) {
            console.log("Error: " + error.code);
        });
        play.once("value").then(function(snapshot) {
            console.log('coucou!');
            resume=snapshot.val();
            if(resume<(nb-1)){
                database.ref("production/meetings").child(reg).child("runtime").update({ currentPointIndex : resume+1 });
                database.ref("production/meetings").child(reg).child("runtime").child("timer").update({
                    secondsPaused: 0,
                    startTimeStamp: Math.round(Date.now() / 1000),
                    lastResumeTimeStamp: 0,
                });
            }
            else{
                database.ref("production/meetings").child(reg).child("runtime").update({
                    meetingEnded: true,
                    endTimeStamp: Math.round(Date.now() / 1000),
                });
            }
            return res.send('Sended next');
        }, function (error) {
            console.log("Error: " + error.code);
        });}, function (error) {
            console.log("Error: " + error.code);
        });
    
});
/*exports.scheduledFunction = functions.pubsub.schedule('every 5 minutes').onRun((context) => {
    // getting dest email by query string
    const dest = "levy.alexandre@yahoo.fr";//req.query.dest;
    const obj= "jambon";
    const content = "J'aimerais bien un sandwich au jambon";

    const mailOptions = {
        from: 'Alexandre Levy <alexandrefrancoislevy@gmail.com>', // Something like: Jane Doe <janedoe@gmail.com>
        to: dest,
        subject: obj, // email subject
        html: content // email content in HTML
    };

    // returning result
    return transporter.sendMail(mailOptions, (erro, info) => {
        if(erro){
            console.log(erro.toString());
            return null;
        }
        return null;
    });
});*/
exports.GetTime = functions.https.onRequest((req, res) => {
      
    const dest = req.query.dest;
    var meetingList = database.ref("production/meetingsList/"+dest);
    var reg;

    

    return  meetingList.once("value").then(function(snapshot) {
        reg = snapshot.val();
        var play= database.ref("production/meetings/"+reg+"/runtime/timer");
        play.once("value").then(function(snapshot) {
            console.log('hello!');
            const paused = snapshot.child("paused").val();
            const timeNow = Math.round(Date.now() / 1000);
            
            const timeStart = snapshot.child("startTimeStamp").val();
            if (!timeNow || !timeStart) {
                return console.log(0);
            }
            const timeLastPause = snapshot.child("lastPauseTimeStamp").val();
            const secondsPreviouslyPaused = snapshot.child("secondsPaused").val();
            const totalSecondsPassed = timeNow - timeStart;

            let secondInCurrentPause = paused ? timeNow - timeLastPause : 0;
            if (!timeLastPause) secondInCurrentPause = 0;

            const pausedSecondsPassed = secondsPreviouslyPaused + secondInCurrentPause;

            var secondPassed = (totalSecondsPassed - pausedSecondsPassed);
            var point= database.ref("production/meetings/"+reg+"/runtime");
            point.once("value").then(function(snapshot) {
                const pointIndex = snapshot.child("currentPointIndex").val();
                var currpoint= database.ref("production/meetings/"+reg+"/agenda/pointsOrder/"+pointIndex);
                currpoint.once("value").then(function(snapshot) {
                    const pointId = snapshot.val();
                    var pointInfo= database.ref("production/meetings/"+reg+"/agenda/points/"+pointId);
                    pointInfo.once("value").then(function(snapshot) {
                        var duration = snapshot.child("duration").val();
                        var delay = snapshot.child("delay").val();
                        var min = duration + delay - ((secondPassed - (secondPassed%60))/ 60);
                        console.log(min);
                        return res.send(String(min));

                    }, function (error) {
                    console.log("Error: " + error.code);
                  });
                    
                }, function (error) {
                    console.log("Error: " + error.code);
                  });
            }, function (error) {
                console.log("Error: " + error.code);
              });
      }, function (error) {
        console.log("Error: " + error.code);
      }); }, function (error) {
        console.log("Error: " + error.code);
    }); 
});

exports.SendNot = functions.runWith({ memory: '2GB', timeoutSeconds: 70 }).https.onRequest((req, res) => {
      
    const dest = req.query.dest;
    return database.ref("production/meetings").once('value').then(function(snap){
        snap.forEach(function(childNodes){
            
            var nb = childNodes.child("agenda").child("points").numChildren();
            //console.log("nb points");
            //console.log(nb);
            if(nb != null){
                var snapshot= childNodes.child("runtime").child("timer");
                const paused = snapshot.child("paused").val();
                const timeNow = Math.round(Date.now() / 1000);
                
                const timeStart = snapshot.child("startTimeStamp").val();
                if (!timeNow || !timeStart) {
                    //return console.log(0);
                }
                const timeLastPause = snapshot.child("lastPauseTimeStamp").val();
                const secondsPreviouslyPaused = snapshot.child("secondsPaused").val();
                const totalSecondsPassed = timeNow - timeStart;
                

                let secondInCurrentPause = paused ? timeNow - timeLastPause : 0;
                if (!timeLastPause) secondInCurrentPause = 0;

                const pausedSecondsPassed = secondsPreviouslyPaused + secondInCurrentPause;

                var secondPassed = (totalSecondsPassed - pausedSecondsPassed);
                var minPassed = ((secondPassed - (secondPassed%60))/ 60);
                var pointIndex = childNodes.child("runtime").child("currentPointIndex").val();
                //console.log("pointIndex");
                //console.log(pointIndex);
                var i;
                var min_before=0;
                for (i = 0; i < (nb-pointIndex); i++) {
                    //console.log("lol");
                    var pointId = childNodes.child("agenda").child("pointsOrder").child(pointIndex+i).val();
                    var point = childNodes.child("agenda").child("points").child(pointId);
                    var dur = point.child("duration").val();
                    var title = point.child("title").val();
                    var delay = point.child("delay").val();
                    
                    var sub = point.child("subscribers");
                    console.log(title);
                    //console.log("nb sub");
                    //console.log(sub.numChildren());
                    if(sub != null){
                        min_before = min_before + dur + delay;
                        for (j = 0; j < sub.numChildren(); j++) {
                            //console.log("hello");
                            var mail = sub.child(j).val();
                            console.log(mail);
                            var point = childNodes.child("agenda").child("participants").forEach(function(childN){
                                    if (childN.child("email").val() == mail){
                                        if(childN.child("notifyOnPoint").val()==true){
                                            var not_adv = childN.child("notifyMinutesAdvance").val();
                                            var last_st = childN.child("lastNotificationTimeStamp").val() ;

                                            if((last_st != null) && ((timeNow-last_st)>(not_adv*60))){
                                                if((min_before-minPassed)< not_adv){
                                                    childN.child("lastNotificationTimeStamp").ref.set(timeNow);
                                                    childN.child("notificationContent").ref.set("Your next point is soon");
                                                    childN.child("showNewNotification").ref.set(true);
                                                    
                                                    

                                                    const dest = mail;//req.query.dest;
                                                    const obj= "Your next point is Soon";
                                                    const content = "You are warned that the next point you have to attend is arriving soon "//+ String(not_adv)+ "min";
    
                                                    const mailOptions = {
                                                        from: 'Alexandre Levy <alexandrefrancoislevy@gmail.com>', // Something like: Jane Doe <janedoe@gmail.com>
                                                        to: dest,
                                                        subject: obj, // email subject
                                                        html: content // email content in HTML
                                                    };
    
                                                    // returning result
                                                    transporter.sendMail(mailOptions, (erro, info) => {
                                                        if(erro){
                                                            console.log(erro.toString());
                                                            //return null;
                                                        }
                                                        //return null;
                                                    });
                                                }
                                            }
                                            else if((last_st == null)){
                                                if((min_before-minPassed)< not_adv){
                                                    childN.child("lastNotificationTimeStamp").ref.set(timeNow);
                                                    const dest = mail;//req.query.dest;
                                                    const obj= "Your next point is Soon";
                                                    const content = "You are warned that the next point you have to attend is soon." //is in "+ String(not_adv)+ "min";
    
                                                    const mailOptions = {
                                                        from: 'Alexandre Levy <alexandrefrancoislevy@gmail.com>', // Something like: Jane Doe <janedoe@gmail.com>
                                                        to: dest,
                                                        subject: obj, // email subject
                                                        html: content // email content in HTML
                                                    };
    
                                                    // returning result
                                                    transporter.sendMail(mailOptions, (erro, info) => {
                                                        if(erro){
                                                            console.log(erro.toString());
                                                            //return null;
                                                        }
                                                        //return null;
                                                    });
                                                }
                                            }
                                            /*else{

                                            }*/
                                            
                                        }
                                        
                                        console.log(childN.child("name").val());
                                    }
                            });
                            /*.once("value")
                            .then((results) => {
                                console.log(results.child("name").val());
                            });*/
                        }
                    }
                    
                }
            
            }

        });
        return res.send('getagageteg');

    }, function (error) {
        console.log("Error: " + error.code);
      });
    var meetingList = database.ref("production/meetingsList/"+dest);
    var reg;

    

    /*return  meetingList.once("value").then(function(snapshot) {
        reg = snapshot.val();
        var play= database.ref("production/meetings/"+reg+"/runtime/timer");
        play.once("value").then(function(snapshot) {
            console.log('hello!');
            
            var point= database.ref("production/meetings/"+reg+"/runtime");
            point.once("value").then(function(snapshot) {
                const pointIndex = snapshot.child("currentPointIndex").val();
                var currpoint= database.ref("production/meetings/"+reg+"/agenda/pointsOrder/"+pointIndex);
                currpoint.once("value").then(function(snapshot) {
                    const pointId = snapshot.val();
                    var pointInfo= database.ref("production/meetings/"+reg+"/agenda/points/"+pointId);
                    pointInfo.once("value").then(function(snapshot) {
                        var duration = snapshot.child("duration").val();
                        var delay = snapshot.child("delay").val();
                        var min = duration + delay - ((secondPassed - (secondPassed%60))/ 60);
                        console.log(min);
                        return res.send(String(min));

                    }, function (error) {
                    console.log("Error: " + error.code);
                  });
                    
                }, function (error) {
                    console.log("Error: " + error.code);
                  });
            }, function (error) {
                console.log("Error: " + error.code);
              });
      }, function (error) {
        console.log("Error: " + error.code);
      }); }, function (error) {
        console.log("Error: " + error.code);
    });*/ 
});

exports.SendStart = functions.runWith({ memory: '2GB', timeoutSeconds: 70 }).https.onRequest((req, res) => {
      
    const dest = req.query.dest;
    return database.ref("production/meetings").once('value').then(function(snap){
        snap.forEach(function(childNodes){
            
            var started = childNodes.child("runtime").child("timer").val();
            if ( started != null){
                if(started == true){
                    childNodes.child("agenda").child("participants").forEach(function(childN){
                        if(childN.child("lastNotificationTimeStamp").val()== ""){
                            const timeNow = Math.round(Date.now() / 1000);
                            childN.child("lastNotificationTimeStamp").set(timeNow);
                            const dest = childN.child("email").val();//req.query.dest;
                            const obj= "Your meeting is starting";
                            const content = "Your meeting is starting now.";

                            const mailOptions = {
                                from: 'Alexandre Levy <alexandrefrancoislevy@gmail.com>', // Something like: Jane Doe <janedoe@gmail.com>
                                to: dest,
                                subject: obj, // email subject
                                html: content // email content in HTML
                            };

                            // returning result
                            transporter.sendMail(mailOptions, (erro, info) => {
                                if(erro){
                                    console.log(erro.toString());
                                    //return null;
                                }
                                //return null;
                            });
                        }
                    });

                }
            }
            //console.log("nb points");
            //console.log(nb);

        });
        return res.send('getagageteg');

    }, function (error) {
        console.log("Error: " + error.code);
      });
    var meetingList = database.ref("production/meetingsList/"+dest);
    var reg;

    

    /*return  meetingList.once("value").then(function(snapshot) {
        reg = snapshot.val();
        var play= database.ref("production/meetings/"+reg+"/runtime/timer");
        play.once("value").then(function(snapshot) {
            console.log('hello!');
            
            var point= database.ref("production/meetings/"+reg+"/runtime");
            point.once("value").then(function(snapshot) {
                const pointIndex = snapshot.child("currentPointIndex").val();
                var currpoint= database.ref("production/meetings/"+reg+"/agenda/pointsOrder/"+pointIndex);
                currpoint.once("value").then(function(snapshot) {
                    const pointId = snapshot.val();
                    var pointInfo= database.ref("production/meetings/"+reg+"/agenda/points/"+pointId);
                    pointInfo.once("value").then(function(snapshot) {
                        var duration = snapshot.child("duration").val();
                        var delay = snapshot.child("delay").val();
                        var min = duration + delay - ((secondPassed - (secondPassed%60))/ 60);
                        console.log(min);
                        return res.send(String(min));

                    }, function (error) {
                    console.log("Error: " + error.code);
                  });
                    
                }, function (error) {
                    console.log("Error: " + error.code);
                  });
            }, function (error) {
                console.log("Error: " + error.code);
              });
      }, function (error) {
        console.log("Error: " + error.code);
      }); }, function (error) {
        console.log("Error: " + error.code);
    });*/ 
});
exports.PlayPause = functions.https.onRequest((req, res) => {
      
    const dest = req.query.dest;
    var reg;
    var meetingList = database.ref("production/meetingsList/"+dest);
    var play;
    
    
    var paused= true;
   /* play.once("value").then(function(snapshot) {
      console.log('coucou!');
      resume=snapshot.child("currentPointIndex").val();
      console.log(resume);
      
    }, function (error) {
      console.log("Error: " + error.code);
    });*/
    //database.ref("production/meetings").child(dest).child("runtime").update({ currentPointIndex : 2 });
    return meetingList.once("value").then(function(snapshot) {
        reg = snapshot.val();
        play= database.ref("production/meetings/"+reg+"/runtime/timer");
        play.once("value").then(function(snapshot) {
            console.log('coucou!');
            paused=snapshot.child("paused").val();
            const timeNow = Math.round(Date.now() / 1000);
            const timeLastPaused = snapshot.child("lastPauseTimeStamp").val();
    
            const secondsPaused = snapshot.child("secondsPaused").val();
            const newSecondsPaused = timeNow - timeLastPaused;
    
            console.log(paused);
            if(paused==true){
                database.ref("production/meetings").child(reg).child("runtime").child("timer").update({ 
                    paused: false,
                    lastResumeTimeStamp: timeNow,
                    secondsPaused: secondsPaused + newSecondsPaused });
              }
              else{
                database.ref("production/meetings").child(reg).child("runtime").child("timer").update({ 
                    paused : true ,
                    lastPauseTimeStamp : timeNow });
    
              }
            
            return res.send('Sended pause/resume');
          }, function (error) {
            console.log("Error: " + error.code);
          });
        
        console.log(reg);
    }, function (error) {
        console.log("Error: " + error.code);
    });
});