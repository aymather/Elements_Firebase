// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });
const functions = require('firebase-functions');
const MONGO_URI = functions.config().settings.mongo_uri;
const mongoose = require('mongoose');
const User = require('./config/models');
const REFRESH_TOKEN_URI = functions.config().settings.refresh_token_api_url;
const API_KEY = functions.config().settings.refresh_token_api_key;
const rp = require('request-promise');
const timescale = '0 */6 * * *'; // every 6 hours

function getOptions(retreat_id, client_id, refresh_token){
    return {
        method: 'POST',
        uri: REFRESH_TOKEN_URI,
        headers: {
            'x-auth-api-key': API_KEY
        },
        body: {
            retreat_id,
            client_id,
            refresh_token
        },
        json: true
    }
}

exports.refreshTokens = functions.pubsub
        .schedule(timescale)
        .onRun(async () => {

            try {

                // Connect to database
                await mongoose.connect(MONGO_URI, { useNewUrlParser: true })

                // Get root user
                var user = await User.findOne();

                // Go through every retreat
                for(let retreat of user.retreats){

                    // Go through each client of that retreat
                    for(let client of retreat.clients){

                        // Check to make sure they have oura configured
                        if(
                            client.oura_api &&
                            client.oura_api.oura_access_token &&
                            client.oura_api.oura_refresh_token
                        ) {
                            // Make request to api endpoint
                            const options = getOptions(retreat._id, client._id, client.oura_api.oura_refresh_token);
                            console.log(options);
                            rp(options);
                        }
                        
                    }

                }

            } catch(e) {
                console.log(e);
                console.log('We caught an error');
            }
        })