/**
 * Copyright (C) 2020 Xibo Signage Ltd
 *
 * Xibo - Digital Signage - http://www.xibo.org.uk
 *
 * This file is part of Xibo.
 *
 * Xibo is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * any later version.
 *
 * Xibo is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Xibo.  If not, see <http://www.gnu.org/licenses/>.
 */
window.xiboIC = (function() {
    'use strict';

    // Private vars
    const _lib = {
        protocol: '', // default protocol 
        hostName: '', // default URL 
        port: '', // default PORT 
        headers: [], // Default headers 
        timelimit: 5000, // timelimit in milliseconds
        callbackQueue : [],
        isVisible: true, // Widget visibility on the player
        isPreview: false, // If the library is being used by a preview
        targetId: (typeof xiboICTargetId != 'undefined') ? xiboICTargetId : undefined, // target id

        /**
         * Get URL string
         */
        getOriginURL: function() {
            if (this.protocol != '' && this.hostName != '') {
                return this.protocol + '://' + this.hostName + ((this.port != '') ? ':' + this.port : '');
            }
            return '';
        },

        /**
         * Make a request to the configured server/player
         * @param  {string} path - Request path
         * @param  {Object} [options] - Optional params
         * @param  {string} [options.type]
         * @param  {Object[]} [options.headers] - Request headers in the format {key: key, value: value}
         * @param  {Object} [options.data]
         * @param  {callback} [options.done]
         * @param  {callback} [options.error]
         */
        makeRequest: function(path, {type, headers, data, done, error} = {}) {
            const self = this;

            // Preview
            if(self.isPreview) {
                // Call the preview action if it exists
                if(typeof parent.previewActionTrigger == 'function') {
                    parent.previewActionTrigger(path, data, done);
                }

                // Stop the method to avoid a request
                return;
            }
            
            const urlToUse = self.getOriginURL() + path;
            const typeToUse = (type) ? type : 'GET';
            const reqHeaders = (headers) ? headers : self.headers;

            // Init AJAX
            let xhr = new XMLHttpRequest();
            xhr.timeout = self.timelimit;

            xhr.open(typeToUse, urlToUse, true);

            // Set headers
            if(type == 'POST') {
                xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
            }

            reqHeaders.forEach(header => {
                xhr.setRequestHeader(header.key, header.value);
            });

            // Append data
            let newData = null;
            if (typeof(data) == "object") {
                newData = JSON.stringify(data);
            }

            // On load complete
            xhr.onload = function() {
                if(xhr.status >= 200 && xhr.status <= 299) {
                    if (typeof(done) == "function") {
                        done(this);
                    }
                } else {
                    if (typeof(error) == "function") {
                        error(this);
                    }
                }
            };

            // Send!
            xhr.send(newData);
        },
    };

    // Public library
    const mainLib = {
        /**
         * Check if the current widget is visible
         */
        checkVisible: function() { // Check if the widget is hidden or visible
            $.urlParam = function(name){
                var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
                if (results == null){
                   return null;
                }
                else {
                   return decodeURI(results[1]) || 0;
                }
            };
            
            _lib.isVisible = ($.urlParam("visible")) ? ($.urlParam("visible") == 1) : true;
            return _lib.isVisible;
        },

        /**
         * Check if we're running in a preview
         */
        checkIsPreview: function() {
            // For the widget preview in viewer
            if(typeof window.parent.lD != 'undefined' || typeof window.parent.parent.lD != 'undefined') {
                _lib.isPreview = true;
                return true;
            }

            return false;
        },

        /**
         * Configure the library options
         * @param  {Object} [options]
         * @param  {string} [options.hostName]
         * @param  {string} [options.port]
         * @param  {Object[]} [options.headers] - Request headers in the format {key: key, value: value}
         * @param  {string} [options.headers.key]
         * @param  {string} [options.headers.value]
         * @param  {string} [options.protocol]
         */
        config: function({ hostName, port, headers, protocol } = {}) {
            // Initialise custom request params
            _lib.hostName = hostName ? hostName : _lib.hostName;
            _lib.port = port ? port : _lib.port;
            _lib.headers = headers ? headers : _lib.headers;
            _lib.protocol = protocol ? protocol : _lib.protocol;
        },

        /**
         * Get player info
         * @param  {Object[]} [options] - Request options
         * @param  {callback} [options.done]
         * @param  {callback} [options.error]
         */
        info: function({ done, error } = {}) {
            _lib.makeRequest(
                '/info',
                {
                    done: done,
                    error: error
                }
            );
        },
        
        /**
         * Trigger a predefined action
         * @param  {string} code - The trigger code
         * @param  {string} [options.targetId] - target id
         * @param  {Object[]} [options] - Request options
         * @param  {callback} [options.done]
         * @param  {callback} [options.error]
         */
        trigger(code, { targetId, done, error } = {}) {
            // Get target id from the request option or from the global lib var
            var id = (typeof targetId != 'undefined') ? targetId : _lib.targetId;

            _lib.makeRequest(
                '/trigger',
                {
                    type: 'POST',
                    data: {
                        id: id,
                        trigger: code
                    },
                    done: done,
                    error: error
                }
            );
        },

        /**
         * Expire widget
         * @param  {Object[]} [options] - Request options
         * @param  {string} [options.targetId] - target id
         * @param  {callback} [options.done]
         * @param  {callback} [options.error]
         */
        expireNow({ targetId, done, error } = {}) {
            // Get target id from the request option or from the global lib var
            var id = (typeof targetId != 'undefined') ? targetId : _lib.targetId;

            _lib.makeRequest(
                '/duration/expire',
                {
                    type: 'POST',
                    data: {
                        id: id
                    },
                    done: done,
                    error: error
                }
            );
        },
        
        /**
         * Extend widget duration
         * @param  {string} duration - Duration value to extend
         * @param  {Object[]} [options] - Request options
         * @param  {string} [options.targetId] - target id
         * @param  {callback} [options.done]
         * @param  {callback} [options.error]
         */
        extendWidgetDuration(duration, { targetId, done, error } = {}) {
            // Get target id from the request option or from the global lib var
            var id = (typeof targetId != 'undefined') ? targetId : _lib.targetId;

            _lib.makeRequest(
                '/duration/extend',
                {
                    type: 'POST',
                    data: {
                        id: id,
                        duration: duration
                    },
                    done: done,
                    error: error
                }
            );
        },
        
        /**
         * Set widget duration
         * @param  {string} duration - New widget duration
         * @param  {Object[]} [options] - Request options
         * @param  {string} [options.targetId] - target id
         * @param  {callback} [options.done]
         * @param  {callback} [options.error]
         */
        setWidgetDuration(duration, { targetId, done, error } = {}) {
            // Get target id from the request option or from the global lib var
            var id = (typeof targetId != 'undefined') ? targetId : _lib.targetId;

            _lib.makeRequest(
                '/duration/set',
                {
                    type: 'POST',
                    data: {
                        id: id,
                        duration: duration
                    },
                    done: done,
                    error: error
                }
            );
        },

        /**
         * Add callback function to the queue
         * @param  {callback} callback - Function to store
         * @param  {Object[]} [args] - Function arguments
         */
        addToQueue(callback, ...args) {
            if(typeof callback != 'function') {
                console.error('Invalid callback function');
            }

            _lib.callbackQueue.push({
                callback: callback,
                arguments: args
            });
        },

        /**
         * Run promised functions in queue
         */
        runQueue() {
            _lib.callbackQueue.forEach((element) => {
                element.callback.apply(_lib, element.arguments);
            });

            // Empty queue
            _lib.callbackQueue = [];
        },

        /**
         * Set visible and run queue
         */
        setVisible() {
            _lib.isVisible = true;
            this.runQueue();
        },

        /**
         * Lock text selection
         */
        lockTextSelection(lock = true) {
            if(lock) {
                $('<style class="lock-text-selection-style">').append('* {' +
                    '-webkit-touch-callout: none;' +
                    '-webkit-user-select: none;' +
                    '-khtml-user-select: none;' +
                    '-moz-user-select: none;' +
                    '-ms-user-select: none;' +
                    'user-select: none;' +
                '}').appendTo('head');
            } else {
                $('style.lock-text-selection-style').remove();
            }
        },

        /**
         * Lock context menu
         */
        lockContextMenu(lock = true) {
            if(lock) {
                $('body').attr('oncontextmenu', 'return false;');
            } else {
                $('body').removeAttr('oncontextmenu');
            }
        },

        /**
         * Lock pinch zoom
         */
        lockPinchZoom(lock = true) {
            const $viewPortEl = $('head > [name="viewport"]');
            if(lock) {
                // Get original value
                const originalValue = $viewPortEl.attr('content');

                // Backup value as data
                $viewPortEl.data('viewportValueBackup', originalValue);
                $viewPortEl.attr('content', originalValue + ' maximum-scale=1.0, user-scalable=no');
            } else {
                // Restore value
                if($viewPortEl.data('viewportValueBackup') != undefined) {
                    $viewPortEl.attr('content', $viewPortEl.data('viewportValueBackup'));
                }
            }
        },

        /**
         * Lock all properties
         */
        lockAllInteractions(lock = true) {
            this.lockTextSelection(lock);
            this.lockContextMenu(lock);
            this.lockPinchZoom(lock);
        },
    };

    // Check visibility on load
    mainLib.checkVisible();

    // Check if it's a preview
    mainLib.checkIsPreview();
    
    return mainLib;
})();
