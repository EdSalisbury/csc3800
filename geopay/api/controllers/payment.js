'use strict';

var util = require('util');

module.exports = {
  payment: payment
};


var distance = require('google-distance');
var express = require('express');
var usergrid = require('usergrid');
var app = express();
var usergrid = require('usergrid');
var bodyParser = require('body-parser')
var request = require('request');
var crypto = require('crypto');

app = express()

app.use(bodyParser.json());

var key = "yJ625Ps02x0093e2hW28QVG4Ub2r708z"

function vantiv_auth(merchant, terminal, transaction, address, card, res)
{
    var header = {
        'Content-Type': 'application/json',
        'licenseid': '89a60d56bb44404a974ebc37a41d57a6$$#$$y1pBoL2tx6Ip279oblfvW8UyeyeX38Zq$$#$$2016-04-27$$#$$dev_key$$#$$SHA512withRSA$$#$$RSA$$#$$1$$#$$9BF49CF3FDC39D17E9F865908ED409FB154B3D6191BB791A160B79D88CDA5AFA614A7B1020CB937E496459D015105DC52E33822480AF1C7053F1CFA9428C6217A83B586C7BFBFC7CCF845AA87E82D134456C6C27439F5F9504A61756A87D1920A99A1575304219E99402F6180E775D3B3CDBFAED64B771CDC4A3B0170314DC95FBCA83B8B369F23BDE16C7D8F1FA306F84ED02D7DFDCC8D1A456EB2076D507B5F1A442B15C6F3D051497B89978FADF503256F29AD0125798A000A12168C680EDB400F0F203F3D5383E42A7E5ED32E639832EB44DB923B8EEC4B538655A661E86A95910F20780FA6C4CE3B2AA91116AAE2348C3980EDDBAADB7BEE906C6A5E7CA'
    }

    transaction.TransactionTimestamp = new Date(transaction.TransactionTimestamp).toISOString()

    var authorize = {
        merchant: merchant,
        terminal: terminal,
        transaction: transaction,
        address: address,
        card: card
    };

    var saleInfo = {
        merchant: merchant,
        terminal: terminal,
        transaction: transaction,
        card: card,
        address: address
    }

    var authString =  JSON.stringify(authorize);
    var saleString = JSON.stringify(saleInfo);

    request.post({
        url: 'http://apis.cert.vantiv.com/v1/credit/authorization?sp=1',
        headers: header,
        body: saleString}, function (error, resp, body) {
            if (resp.statusCode != 200) {
                return false;
            }
            var info = JSON.parse(body);

            if (info && info.AuthorizeResponse && info.AuthorizeResponse.ReferenceNumber && info.AuthorizeResponse.AuthorizationCode) {
                var capAuthCode = info.AuthorizeResponse.AuthorizationCode;
                var capRefNum = info.AuthorizeResponse.ReferenceNumber;
                console.log("Authorization started")
                vantiv_process_auth(merchant, terminal, transaction, address, card, capAuthCode, capRefNum, res);
            } else {
                console.log("Authorization unable to start")
                return false;
            }
    });
}

function vantiv_process_auth(merchant, terminal, transaction, address, card, authCode, refNum, res) {
    var header = {
        'Content-Type': 'application/json',
        'licenseid': '89a60d56bb44404a974ebc37a41d57a6$$#$$y1pBoL2tx6Ip279oblfvW8UyeyeX38Zq$$#$$2016-04-27$$#$$dev_key$$#$$SHA512withRSA$$#$$RSA$$#$$1$$#$$9BF49CF3FDC39D17E9F865908ED409FB154B3D6191BB791A160B79D88CDA5AFA614A7B1020CB937E496459D015105DC52E33822480AF1C7053F1CFA9428C6217A83B586C7BFBFC7CCF845AA87E82D134456C6C27439F5F9504A61756A87D1920A99A1575304219E99402F6180E775D3B3CDBFAED64B771CDC4A3B0170314DC95FBCA83B8B369F23BDE16C7D8F1FA306F84ED02D7DFDCC8D1A456EB2076D507B5F1A442B15C6F3D051497B89978FADF503256F29AD0125798A000A12168C680EDB400F0F203F3D5383E42A7E5ED32E639832EB44DB923B8EEC4B538655A661E86A95910F20780FA6C4CE3B2AA91116AAE2348C3980EDDBAADB7BEE906C6A5E7CA'
    }

    var cap = {
        merchant: merchant,
        terminal: terminal,
        transaction: transaction,
        address: address,
        card: card
    };

    var saleInfo = {
        merchant: merchant,
        terminal: terminal,
        transaction: transaction,
        card: card,
        address: address
    }

    var saleString = JSON.stringify(saleInfo);

    cap.transaction.OriginalAuthorizedAmount = transaction.TransactionAmount;
    cap.transaction.CaptureAmount = transaction.TransactionAmount;
    cap.transaction.AuthorizationCode = authCode;
    cap.transaction.OriginalReferenceNumber = refNum;
    var capString = JSON.stringify(cap);

    request.post({
        headers: header,
        url:'https://apis.cert.vantiv.com/v1/credit/authorizationcompletion?sp=1',
        body: capString}, function(err, resp, body) {
            if(err){
                console.log("Authorization failed.  Message = " + resp);
                return false;
            }

            var info = JSON.parse(body);
            var cert = info.AuthorizationCompletionResponse.AuthorizationCode;
            if (cert) {
                console.log("Authorization successful.  Authcode = " + cert);
                console.log("Processing sale.")
                request.post({
                    url: 'http://apis.cert.vantiv.com/v1/credit/sale?sp=1',
                    headers: header,
                    body: saleString}, function (Error, sale_resp, sale_body) {
                        if(Error) {
                            console.log('request problem: ' + Error.message);
                            res.status(500).json({result: 'Declined', reason: Error})
                        }
                        var complete_info = JSON.parse(sale_body)
                        if (complete_info.SaleResponse.TransactionStatus == "settled")
                        {
                            res.status(200).json({result: 'Accepted', authCode: cert, status: complete_info.SaleResponse.TransactionStatus, refNum: complete_info.SaleResponse.ReferenceNumber})
                        }
                });
            }
    });
    //res.status(400).json({result: 'Declined', reason: "Unknown"})
}

function payment(req, res) {

    var details = req.swagger.params.details.value.details;

    var merchant = details.merchant;
    var terminal = details.terminal;
    var address = details.address;
    var transaction = details.transaction;
    var card = details.card;

    // Set up client
    var client = new usergrid.client({
        orgName: 'EdSalisbury',
        appName: 'geopay',
        logging: true
    });

    var hash = crypto.createHmac('sha512', key)
    hash.update(card.CardNumber)
    var hashed_card_num = hash.digest('hex')

    var options = {
        type: 'creditcards',
        name: hashed_card_num
    }

    client.getEntity(options, function (err, existingCard) {
        if (err) {
            console.log("No transactions found")
            // Not found
            var options = {
                type: 'creditcards',
            };

            // Create the entry
            client.createEntity(options, function(newErr, newCard) {
                if (newErr)
                {
                    res.status(500).json({result: 'Declined', reason: 'Unable to create card entry'});
                }
                else
                {
                    var data = {
                        type: 'creditcards',
                        name: hashed_card_num,
                        city: merchant.City,
                        state: merchant.State,
                        timestamp: transaction.TransactionTimestamp
                    }

                    newCard.set(data);

                    newCard.save(function(saveErr) {
                        if (saveErr)
                        {
                            //res.status(500).json({result: 'Declined', reason: 'Unable to create card entry'});
                        }
                    });

                    // Authorize transaction with Vantiv
                    vantiv_auth(merchant, terminal, transaction, address, card, res);
                }
            });
        }
        else
        {
            // An existing entry was found, so let's see if it's valid
            distance.get({origin: existingCard._data.city + ', ' + existingCard._data.state,
                          destination: merchant.City + ', ' + merchant.State,
                          mode:'flying', units: 'imperial'}, function(distanceErr, data) {
                if (distanceErr)
                {
                    console.log(err);
                }
                else {
                    var max_speed = 300; // m/s
                    var distanceBetween = data.distanceValue; // always in meters
                    var time = Math.abs(transaction.TransactionTimestamp - existingCard._data.timestamp)

                    if (time == 0) // Prevent DIV0
                    {
                        var speed = 999999;
                    }
                    else
                    {
                        var speed = distanceBetween / time;
                    }

                    if (distanceBetween == 0)
                    {
                        var speed = 0;
                    }

                    console.log("Old time: " + existingCard._data.timestamp + ", New Time: " + transaction.TransactionTimestamp);
                    console.log("Distance: " + distanceBetween + ", Time difference (s): " + time + ", Speed: " + speed);

                    if (speed > max_speed)
                    {
                        res.status(409).json({result: 'Declined', reason: 'Location'})
                    }
                    else
                    {
                        // Update the card entry
                        data = {
                            type: 'creditcards',
                            name: hashed_card_num,
                            city: merchant.City,
                            state: merchant.State,
                            timestamp: transaction.TransactionTimestamp
                        }

                        existingCard.set(data);

                        existingCard.save(function(saveErr) {
                            if (saveErr)
                            {
                                //res.status(500).json({message: 'Unable to update card entry'});
                            }
                        });

                        vantiv_auth(merchant, terminal, transaction, address, card, res);
                    }
                }
            });
        }
    });
}
