/**
 * logger
 *
 */
"use strict";

var db     = require('../db/');
var logger = {};

logger.init = function (client) {
    // Log channel messages
    client.addListener('message#', function (nick, channel, text, message) {
        var info = {
            nick: nick,
            channel: channel,
            host: message.user + '@' + message.host,
            message: text
        };
        
        logger.log(info, function (result, err) {
            if (err) {
                console.log('logger error: ', err);
            } else {
                //console.log(result);
                //console.log(info);
            }
        });
    });
};

logger.log = function (info, callback) {
    var query = ' INSERT INTO logs SET ?, ts = NOW()';
    
    db.connection.query(query, info, function (err, result) {
        callback(result, err);
    });
};

logger.getRandomQuote = function (args) {
    var cols      = ['ts', 'message'];
    var searchQry = args.searchQuery ? args.searchQuery.trim() : false;
    var searchCls = searchQry        ? ' AND message LIKE ?'   : '';
    var params    = [args.message, args.nick, args.channel];
    
    if (searchCls) {
        params.push('%' + searchQry + '%');
    }
    
    var q    = ' SELECT ';
        q   += cols.join(',');
        q   += ' FROM logs';
        q   += ' WHERE 1=1';        
        // Don't show the message they just sent.
        // Fixes #11 - https://github.com/prgmrbill/guacbot/issues/11
        q   += ' AND message <> ?';
        q   += ' AND nick    =  ?';
        q   += ' AND channel =  ?';
        q   += searchCls;
        // Perhaps improve this in the future by selecting the ids and using JS
        // to select randomly from the set. finally, select a single quote using
        // id. This would significantly increase performance in larger data sets
        q   += ' ORDER BY RAND()';
        q   += ' LIMIT 1';
    
    db.connection.query(q, params, function (err, rows, fields) {
        if (err) {
            console.log('logger.getRandomQuote error: ' + err);
        } else {
            args.callback(rows[0], err);
        }
    });
};

logger.getMentions = function (args) {
    var cols  = ['nick', 'ts', 'channel', 'message'];
    
    /**
     * The limit is user input, so let's make sure it's valid
     * 1. Check that it is an integer
     * 2. Between 1 and 5
     *
     */
    var limit = /^[1-5]$/.test(args.limit) ? args.limit : 1;
    
    var q     = ' SELECT ';
        q    += cols.join(',');
        q    += ' FROM logs';
        q    += ' WHERE 1=1';
        q    += ' AND channel    = ?';
        q    += ' AND message LIKE ?';
        // Don't show the message they just sent.
        // Fixes #11 - https://github.com/prgmrbill/guacbot/issues/11
        q    += ' AND message <>   ?';
        q    +  ' GROUP BY message, ts'
        q    += ' ORDER BY ts DESC';
        // Can't bind parameters in a limit clause :[
        q    += ' LIMIT ' + limit;
    
    var params    = [args.channel, 
                     '%' + args.searchQuery + '%',
                     args.message];
    
    //console.log('searching for ' + args.searchQuery + ' in channel ' + args.channel + ' limit ' + limit);
    //console.log('not equal to ' + args.message);
    
    // Perhaps implement a timeout here
    var parsedQry = db.connection.query(q, params, function (err, rows, fields) {
        if (err) {
            console.log('logger.getMentions error: ' + err);
        } else {
            args.callback(rows, err);
        }
    });
    
    console.log(parsedQry.sql);
};

logger.searchByMessage = function (nick, searchQuery, callback) {
    var cols = ['nick', 'host', 'message', 'ts', 'channel'];
    var q    = ' SELECT ';
        q   += cols.join(',');
        q   += ' FROM logs';
        q   += ' WHERE 1=1';
        q   += ' AND nick <> ?';
        q   += ' AND message LIKE ?';
        q   += ' ORDER BY ts DESC';
        q   += ' LIMIT 1';
    
    var params    = [nick, '%' + searchQuery + '%'];
    var parsedQry = db.connection.query(q, params, function (err, rows, fields) {
        if (err) {
            console.log('logger error: ' + err);
        } else {
            callback(rows[0], err);
        }
    });
};

logger.getFirstMention = function (args) {
    var cols = ['nick', 'message', 'ts', 'channel'];
    var q    = ' SELECT ';
        q   += cols.join(',');
        q   += ' FROM logs';
        q   += ' WHERE 1=1';
        q   += ' AND channel    = ?';
        q   += ' AND message LIKE ?';
        // Don't show the message they just sent.
        // Fixes #11 - https://github.com/prgmrbill/guacbot/issues/11
        q   += ' AND message <>   ?';
        q   += ' ORDER BY ts';
        q   += ' LIMIT 1';
    
    var params = [args.channel, 
                  '%' + args.searchQuery + '%',
                  args.message];
    
    db.connection.query(q, params, function (err, rows, fields) {
        args.callback(rows[0], err);
    });
};

logger.getLastMention = function (args) {
    var cols = ['nick', 'message', 'ts', 'channel'];
    var q    = ' SELECT ';
        q   += cols.join(',');
        q   += ' FROM logs';
        q   += ' WHERE 1=1';
        q   += ' AND message LIKE ?';
        q   += ' AND channel    = ?';
        // Don't show the message they just sent.
        // Fixes #11 - https://github.com/prgmrbill/guacbot/issues/11
        q   += ' AND message <>   ?';
        q   += ' ORDER BY ts DESC';
        q   += ' LIMIT 1';
    
    var params = ['%' + args.searchQuery + '%', 
                  args.channel,
                  args.message];
    
    db.connection.query(q, params, function (err, rows, fields) {
        args.callback(rows[0], err);
    });
};

logger.getLastMessage = function (args) {
    var cols = ['nick', 'host', 'message', 'ts', 'channel'];
    
    /**
     * The limit is user input, so let's make sure it's valid
     * 1. Check that it is an integer
     * 2. Between 1 and 5
     *
     */
    var limit = /^[1-5]$/.test(args.limit) ? args.limit : 1;
    
    var q    = ' SELECT ';
        q   += cols.join(',');
        q   += ' FROM logs';
        q   += ' WHERE 1=1';
        q   += ' AND nick    = ?';
        q   += ' AND channel = ?';
        // Don't show the message they just sent.
        // Fixes #11 - https://github.com/prgmrbill/guacbot/issues/11
        q   += ' AND message <>   ?';
        q   += ' ORDER BY ts DESC';
        q   += ' LIMIT ' + limit;
    
    var params = [args.nick, args.channel, args.message];
    
    db.connection.query(q, params, function (err, rows, fields) {
        args.callback(rows, err);
    });
};

module.exports = logger;
