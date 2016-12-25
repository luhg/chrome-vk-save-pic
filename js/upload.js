/*global chrome, alert, XMLHttpRequest, FormData, document, window, setTimeout */

function thereIsAnError(textToShow, errorToShow, imageUrl) {
    "use strict";

    console.log(textToShow);
    console.log(errorToShow);
    console.log(imageUrl);
}

/**
 * Main function to upload an image
 *
 * @param  {string} imageUrl URL of the uploaded image
 * @param  {string} fileName Name of the new uploaded file on VK documents
 * @param  {string} accToken Access token with vk authentication permissions
 */
function upload(imageUrl, fileName, accToken, albumId, groupId) {
    "use strict";

    var uploadHttpRequest = new XMLHttpRequest();

    uploadHttpRequest.onload = function () {

        var documentUploadServer = new XMLHttpRequest(),
            requestFormData,
            documentUploadRequest;

        documentUploadServer.open('GET', 'https://api.vk.com/method/photos.getUploadServer?access_token=' + accToken + 
            '&album_id=' + albumId + 
            '&group_id=' + groupId);

        documentUploadServer.onload = function () {

            var answer = JSON.parse(documentUploadServer.response);

            if (answer.error !== undefined) {
                chrome.storage.local.remove('vkaccess_token');

                thereIsAnError('something went wrong', answer.error, imageUrl)

                return;
            }

            if (answer.response.upload_url === undefined) {
                thereIsAnError('documentUploadServer response problem', answer, imageUrl);

                return;
            }

            requestFormData       = new FormData();
            documentUploadRequest = new XMLHttpRequest();

            requestFormData.append("file", uploadHttpRequest.response, fileName);

            documentUploadRequest.open('POST', answer.response.upload_url, true);

            documentUploadRequest.onload = function () {

                var answer = JSON.parse(documentUploadRequest.response),
                    documentSaveRequest;

                if (answer.photos_list == "[]") {
                    thereIsAnError('Upload blob response problem', answer, imageUrl);

                    return;
                }

                documentSaveRequest = new XMLHttpRequest();

                documentSaveRequest.open('GET', 'https://api.vk.com/method/photos.save?access_token=' + accToken + 
                    '&group_id=' + groupId + 
                    '&server=' + answer.server + 
                    '&photos_list=' + answer.photos_list + 
                    '&hash=' + answer.hash + 
                    '&album_id=' + albumId);

                documentSaveRequest.onload = function () {

                    var answer = JSON.parse(documentSaveRequest.response),
                        documentCopyRequest;

                    if (answer.response[0].src === undefined) {
                        thereIsAnError('documentSaveRequest - no file in response', answer, imageUrl);

                        return;
                    }

                    documentCopyRequest = new XMLHttpRequest();

                    documentCopyRequest.open('GET', 'https://api.vk.com/method/photos.copy?access_token=' + accToken + 
                        '&owner_id=' + parseInt(answer.response[0].owner_id) + 
                        '&photo_id=' + parseInt(answer.response[0].pid));

                    documentCopyRequest.onload = function () {
                        var answer = JSON.parse(documentCopyRequest.response)

                        window.close();
                    };

                    documentCopyRequest.send();
                };


                documentSaveRequest.send();
            };

            documentUploadRequest.send(requestFormData);
        };

        documentUploadServer.send();
    };

    uploadHttpRequest.responseType = 'blob';
    uploadHttpRequest.open('GET', imageUrl);
    uploadHttpRequest.send();
}

/**
 * Add a listener for DOMContentLoaded event
 *
 * @param {string}   Event name
 * @param {function} Event handler
 */
document.addEventListener("DOMContentLoaded", function () {
    "use strict";

    var params   = window.location.hash.substring(1).split('&'),
        imageUrl = null,
        filename,
        imageName;

    if (params === undefined || params.length ===  undefined || params.length !== 2) {
        thereIsAnError('Parsing image url', 'params || params.length != 2', imageUrl);
        return;
    }

    filename = params[0].split('/');

    if (filename.length === undefined || filename.length === 0) {
        thereIsAnError('Getting image filename', 'filename.length <= 0', imageUrl);
        return;
    }

    imageUrl = params[0];

    imageName = filename[filename.length - 1];

    if (imageName.indexOf('?') > -1) {
        imageName = imageName.slice(0, imageName.indexOf('?'));
    }

    if (imageName.indexOf('#') > -1) {
        imageName = imageName.slice(0, imageName.indexOf('#'));
    }

    if (imageName.indexOf('&') > -1) {
        imageName = imageName.slice(0, imageName.indexOf('&'));
    }

    var groupId = '135979114'
    var albumId = '239088453'

    upload(imageUrl, imageName, params[1], albumId, groupId);
});

