/*!
 * Image (upload) dialog plugin for Editor.md
 *
 * @file        image-dialog.js
 * @author      pandao
 * @version     1.3.4
 * @updateTime  2015-06-09
 * {@link       https://github.com/pandao/editor.md}
 * @license     MIT
 */

(function () {

    var factory = function (exports) {

        var pluginName = "images-dialog";

        exports.fn.imageDialog = function () {

            var _this = this;
            var cm = this.cm;
            var lang = this.lang;
            var editor = this.editor;
            var settings = this.settings;
            var cursor = cm.getCursor();
            var selection = cm.getSelection();
            var imageLang = lang.dialog.image;
            var classPrefix = this.classPrefix;
            var iframeName = classPrefix + "images-iframe";
            var dialogName = classPrefix + pluginName, dialog;

            cm.focus();

            var loading = function (show) {
                var _loading = dialog.find("." + classPrefix + "dialog-mask");
                _loading[(show) ? "show" : "hide"]();
            };

            if (editor.find("." + dialogName).length < 1) {
                var guid = (new Date).getTime();
                var action = settings.imageUploadURL + (settings.imageUploadURL.indexOf("?") >= 0 ? "&" : "?") + "guid=" + guid;

                if (settings.crossDomainUpload) {
                    action += "&callback=" + settings.uploadCallbackURL + "&dialog_id=editormd-images-dialog-" + guid;
                }

                var dialogContent = (
                        //     (settings.imageUpload) ? "<form id=\"uploadImageForm\" action=\"" + action + "\" target=\"" + iframeName + "\" method=\"post\" enctype=\"multipart/form-data\" class=\"" + classPrefix + "form\">" : "<div class=\"" + classPrefix + "form\">" ) +
                        // ( (settings.imageUpload) ? "<iframe name=\"" + iframeName + "\" id=\"" + iframeName + "\" guid=\"" + guid + "\"></iframe>" : "" ) +
                        (settings.imageUpload) ? "<form id=\"uploadImageForm\" method=\"post\" enctype=\"multipart/form-data\" class=\"" + classPrefix + "form\">" : "<div class=\"" + classPrefix + "form\">" ) +
                    "<label>" + imageLang.url + "</label>" +
                    "<input type=\"text\" data-url />" +
                    (function () {
                        return (settings.imageUpload) ? "<div class=\"" + classPrefix + "file-input\">" +
                            "<input type=\"file\" name=\"" + classPrefix + "images-file\" accept=\"images/*\" />" +
                            "<input type=\"submit\" value=\"" + imageLang.uploadButton + "\" />" +
                            "</div>" : "";
                    })() +
                    "<br/>" +
                    "<label>" + imageLang.alt + "</label>" +
                    "<input type=\"text\" value=\"" + selection + "\" data-alt />" +
                    "<br/>" +
                    "<label>" + imageLang.link + "</label>" +
                    "<input type=\"text\" value=\"http://\" data-link />" +
                    "<br/>" +
                    ( (settings.imageUpload) ? "</form>" : "</div>");

                //var imageFooterHTML = "<button class=\"" + classPrefix + "btn " + classPrefix + "images-manager-btn\" style=\"float:left;\">" + imageLang.managerButton + "</button>";

                dialog = this.createDialog({
                    title: imageLang.title,
                    width: (settings.imageUpload) ? 465 : 380,
                    height: 254,
                    name: dialogName,
                    content: dialogContent,
                    mask: settings.dialogShowMask,
                    drag: settings.dialogDraggable,
                    lockScreen: settings.dialogLockScreen,
                    maskStyle: {
                        opacity: settings.dialogMaskOpacity,
                        backgroundColor: settings.dialogMaskBgColor
                    },
                    buttons: {
                        enter: [lang.buttons.enter, function () {
                            var url = this.find("[data-url]").val();
                            var alt = this.find("[data-alt]").val();
                            var link = this.find("[data-link]").val();

                            if (url === "") {
                                alert(imageLang.imageURLEmpty);
                                return false;
                            }

                            var altAttr = (alt !== "") ? " \"" + alt + "\"" : "";

                            if (link === "" || link === "http://") {
                                cm.replaceSelection("![" + alt + "](" + url + altAttr + ")");
                            }
                            else {
                                cm.replaceSelection("[![" + alt + "](" + url + altAttr + ")](" + link + altAttr + ")");
                            }

                            if (alt === "") {
                                cm.setCursor(cursor.line, cursor.ch + 2);
                            }

                            this.hide().lockScreen(false).hideMask();

                            return false;
                        }],

                        cancel: [lang.buttons.cancel, function () {
                            this.hide().lockScreen(false).hideMask();

                            return false;
                        }]
                    }
                });

                dialog.attr("id", classPrefix + "images-dialog-" + guid);

                if (!settings.imageUpload) {
                    return;
                }

                var fileInput = dialog.find("[name=\"" + classPrefix + "images-file\"]");

                // 获取文件后缀名
                var suffix = /.[^.]+$/.exec(fileInput.fileName)[0];
                console.log(suffix);

                // 构造上传数据
                var constructUploadData = function (data) {
                    console.log('uploadFile');
                    var formData = new FormData();
                    formData.append('file', fileInput[0].files[0]);
                    formData.append("key", data.key);
                    formData.append("token", data.token);
                    uploadFile(formData);
                }

                // 上传文件
                var uploadFile = function (data) {
                    $.ajax({
                        url: '/api/qiniuToken/',
                        type: "post",
                        data: data,
                        cache: false,
                        processData: false,
                        contentType: false,
                        success: function (data) {
                            console.log(data);
                        },
                        error: function (e) {
                            console.log(e);
                        }
                    });
                }

                fileInput.bind("change", function () {

                    var fileName = fileInput.val();
                    var isImage = new RegExp("(\\.(" + settings.imageFormats.join("|") + "))$"); // /(\.(webp|jpg|jpeg|gif|bmp|png))$/

                    if (fileName === "") {
                        alert(imageLang.uploadFileEmpty);

                        return false;
                    }

                    if (!isImage.test(fileName)) {
                        alert(imageLang.formatNotAllowed + settings.imageFormats.join(", "));

                        return false;
                    }

                    loading(true);

                    var submitHandler = function () {

                        var uploadIframe = document.getElementById(iframeName);

                        uploadIframe.onload = function () {

                            loading(false);

                            var body = (uploadIframe.contentWindow ? uploadIframe.contentWindow : uploadIframe.contentDocument).document.body;
                            var json = (body.innerText) ? body.innerText : ( (body.textContent) ? body.textContent : null);

                            json = (typeof JSON.parse !== "undefined") ? JSON.parse(json) : eval("(" + json + ")");

                            if (json.success === 1) {
                                dialog.find("[data-url]").val(json.url);
                            }
                            else {
                                alert(json.message);
                            }

                            return false;
                        };
                    };

                    console.log('select file');

                    // dialog.find("[type=\"submit\"]").bind("click", submitHandler).trigger("click");

                    // 获取token
                    $.ajax({
                        url: '/api/qiniuToken/',
                        type: "post",
                        data: {use_type: 'publish_post', suffix: suffix},
                        success: constructUploadData,
                        error: function (e) {
                            console.log(e);
                        }
                    });
                });
            }

            dialog = editor.find("." + dialogName);
            dialog.find("[type=\"text\"]").val("");
            dialog.find("[type=\"file\"]").val("");
            dialog.find("[data-link]").val("http://");

            this.dialogShowMask(dialog);
            this.dialogLockScreen();
            dialog.show();

        };

    };

    // CommonJS/Node.js
    if (typeof require === "function" && typeof exports === "object" && typeof module === "object") {
        module.exports = factory;
    }
    else if (typeof define === "function")  // AMD/CMD/Sea.js
    {
        if (define.amd) { // for Require.js

            define(["editormd"], function (editormd) {
                factory(editormd);
            });

        } else { // for Sea.js
            define(function (require) {
                var editormd = require("./../../editormd");
                factory(editormd);
            });
        }
    }
    else {
        factory(window.editormd);
    }

})();