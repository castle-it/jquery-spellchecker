/*\n * jQuery Spellchecker - v0.2.6 - 2015-05-05\n * https://github.com/castle-it/jquery-spellchecker
 * Copyright (c) 2015 Richard Willis; Licensed MIT\n */(function(window, $) {

  /* Config
   *************************/

  var defaultConfig = {
    lang: 'en',
    webservice: {
      path: 'spellchecker.php',
      driver: 'PSpell'
    },
    local: {
      requestError: 'There was an error processing the request.',
      ignoreWord: 'Ignore word',
      ignoreAll: 'Ignore all',
      ignoreForever: 'Add to dictionary',
      loading: 'Loading...',
      noSuggestions: '(No suggestions)'
    },
    suggestBox: {
      numWords: 5,
      position: 'above',
      offset: 2,
      appendTo: null
    },
    incorrectWords: {
      container: 'body', //selector
      position: null //function
    }
  };

  var pluginName = 'spellchecker';

  /* Util
   *************************/

  if (!Function.prototype.bind) {
    Function.prototype.bind = function(scope) {
      return $.proxy(this, scope);
    };
  }

  var inherits = function(_sub, _super) {
    function F() {}
    F.prototype = _super.prototype;
    _sub.prototype = new F();
    _sub.prototype.constructor = _sub;
  };

  var decode = function(text) {
    return $('<div />').html(text).html();
  };

  RegExp.escape = function(text) {
    return text.replace(/[\-\[\]{}()*+?.,\^$|#\s]/g, "\\$&");
  };

  /* Character sets
   *************************/

  var punctuationChars = '\\u0021-\\u0023\\u0025-\\u002A\\u002C-\\u002F\\u003A\\u003B\\u003F\\u0040\\u005B-\\u005D\\u005F\\u007B\\u007D\\u00A1\\u00A7\\u00AB\\u00B6\\u00B7\\u00BB\\u00BF\\u037E\\u0387\\u055A-\\u055F\\u0589\\u058A\\u05BE\\u05C0\\u05C3\\u05C6\\u05F3\\u05F4\\u0609\\u060A\\u060C\\u060D\\u061B\\u061E\\u061F\\u066A-\\u066D\\u06D4\\u0700-\\u070D\\u07F7-\\u07F9\\u0830-\\u083E\\u085E\\u0964\\u0965\\u0970\\u0AF0\\u0DF4\\u0E4F\\u0E5A\\u0E5B\\u0F04-\\u0F12\\u0F14\\u0F3A-\\u0F3D\\u0F85\\u0FD0-\\u0FD4\\u0FD9\\u0FDA\\u104A-\\u104F\\u10FB\\u1360-\\u1368\\u1400\\u166D\\u166E\\u169B\\u169C\\u16EB-\\u16ED\\u1735\\u1736\\u17D4-\\u17D6\\u17D8-\\u17DA\\u1800-\\u180A\\u1944\\u1945\\u1A1E\\u1A1F\\u1AA0-\\u1AA6\\u1AA8-\\u1AAD\\u1B5A-\\u1B60\\u1BFC-\\u1BFF\\u1C3B-\\u1C3F\\u1C7E\\u1C7F\\u1CC0-\\u1CC7\\u1CD3\\u2010-\\u2027\\u2030-\\u2043\\u2045-\\u2051\\u2053-\\u205E\\u207D\\u207E\\u208D\\u208E\\u2329\\u232A\\u2768-\\u2775\\u27C5\\u27C6\\u27E6-\\u27EF\\u2983-\\u2998\\u29D8-\\u29DB\\u29FC\\u29FD\\u2CF9-\\u2CFC\\u2CFE\\u2CFF\\u2D70\\u2E00-\\u2E2E\\u2E30-\\u2E3B\\u3001-\\u3003\\u3008-\\u3011\\u3014-\\u301F\\u3030\\u303D\\u30A0\\u30FB\\uA4FE\\uA4FF\\uA60D-\\uA60F\\uA673\\uA67E\\uA6F2-\\uA6F7\\uA874-\\uA877\\uA8CE\\uA8CF\\uA8F8-\\uA8FA\\uA92E\\uA92F\\uA95F\\uA9C1-\\uA9CD\\uA9DE\\uA9DF\\uAA5C-\\uAA5F\\uAADE\\uAADF\\uAAF0\\uAAF1\\uABEB\\uFD3E\\uFD3F\\uFE10-\\uFE19\\uFE30-\\uFE52\\uFE54-\\uFE61\\uFE63\\uFE68\\uFE6A\\uFE6B\\uFF01-\\uFF03\\uFF05-\\uFF0A\\uFF0C-\\uFF0F\\uFF1A\\uFF1B\\uFF1F\\uFF20\\uFF3B-\\uFF3D\\uFF3F\\uFF5B\\uFF5D\\uFF5F-\\uFF65';


  /* Events
   *************************/

  var Events = function(){
    this._handlers = {};
  };

  Events.prototype = {
    on: function(name, handler) {
      if (!this._handlers[name]) {
        this._handlers[name] = $.Callbacks();
      }
      this._handlers[name].add(handler);
    },
    trigger: function(name) {
      var args = Array.prototype.slice.call(arguments, 1);
      if ($.isFunction(name)) {
        return name.apply(this, args);
      }
      if (this._handlers[name]) {
        this._handlers[name].fireWith(this, args);
      }
    },
    handler: function(name) {
      return function(e) {
        this.trigger(name, e);
      }.bind(this);
    }
  };

  /* Handlers 
   *************************/

  var selectWordHandler = function(handlerName) {

    return function(e) {

      e.preventDefault();
      e.stopPropagation();

      var element = $(e.currentTarget);
      var word = $.trim(element.data('word') || element.text());

      this.trigger(handlerName, e, word, element, this);

    }.bind(this);
  };

  /* Collections 
   *************************/

  var Collection = function(elements, instanceFactory) {
    this.instances = [];
    for(var i = 0; i < elements.length; i++) {
      this.instances.push( instanceFactory(elements[i]) );
    }
    this.methods([ 'on', 'destroy', 'trigger' ]);
  };

  Collection.prototype.methods = function(methods) {
    $.each(methods, function(i, method) {
      this[method] = function() {
        this.execute(method, arguments);
      }.bind(this);
    }.bind(this));
  };

  Collection.prototype.execute = function(method, args) {
    $.each(this.instances, function(i, instance) {
      instance[method].apply(instance, args);
    });
  };

  Collection.prototype.get = function(i) {
    return this.instances[i];
  };

  /* Base box
   *************************/

  var Box = function(config, parser, element, findAndReplaceDOMText) {
    Events.call(this);
    this.config = config;
    this.parser = parser;
    this.spellCheckerElement = $(element);
    this.findAndReplaceDOMText = findAndReplaceDOMText;
    this.createBox();
    this.bindEvents();
  };
  inherits(Box, Events);

  /* Incorrect words box
   *************************/

  var IncorrectWordsBox = function(config, parser, element, findAndReplaceDOMText) {
    Box.apply(this, arguments);
  };
  inherits(IncorrectWordsBox, Box);

  IncorrectWordsBox.prototype.bindEvents = function() {
    this.container.on('click', 'a', selectWordHandler.call(this, 'select.word'));
    this.on('addWords', this.addWords.bind(this));
  };

  IncorrectWordsBox.prototype.createBox = function() {

    this.container = $([
      '<div class="' + pluginName + '-incorrectwords">',
      '</div>'
    ].join(''))
        .hide();

    if ($.isFunction(this.config.incorrectWords.position)) {
      this.config.incorrectWords.position.call(this.spellCheckerElement, this.container);
    } else {
      this.container.appendTo(this.config.incorrectWords.container);
    }
  };

  IncorrectWordsBox.prototype.addWords = function(words) {

    // Make array values unique
    words = $.grep(words, function(el, index){
      return index === $.inArray(el, words);
    });

    var html = $.map(words, function(word) {
      return '<a href="#">' + word + '</a>';
    }).join('');

    this.container.html(html).show();
  };

  IncorrectWordsBox.prototype.removeWord = function(elem) {
    if (elem) {
      elem.remove();
    }
    if (this.container.children().length === 0) {
      this.container.hide();
    }
  };

  IncorrectWordsBox.prototype.destroy = function() {
    this.container.empty().remove();
  };

  /* Incorrect words inline
   *************************/

  var IncorrectWordsInline = function(config, parser, element, findAndReplaceDOMText) {
    Events.call(this);
    this.config = config;
    this.parser = parser;
    this.spellCheckerElement = this.element = $(element);
    this.findAndReplaceDOMText = findAndReplaceDOMText;
    this.bindEvents();
  };
  inherits(IncorrectWordsInline, Events);

  IncorrectWordsInline.prototype.bindEvents = function() {
    this.element.on('click.' + pluginName, '.' + pluginName + '-word-highlight', selectWordHandler.call(this, 'select.word'));
  };

  IncorrectWordsInline.prototype.addWords = function(words) {
    var highlighted = this.parser.highlightWords(words, this.element);
    this.element.html(highlighted);
  };

  IncorrectWordsInline.prototype.removeWord = function(elem) {};

  IncorrectWordsInline.prototype.destroy = function() {
    this.element.off('.' + pluginName);
    try {
      this.findAndReplaceDOMText.revert();
    } catch(e) {
    }
  };

  /* Suggest box
   *************************/

  var SuggestBox = function(config, element) {
    this.element = element;
    if (config.suggestBox.appendTo) {
      this.body = $(config.suggestBox.appendTo);
    } else {
      this.body = (this.element.length && this.element[0].nodeName === 'BODY') ? this.element : 'body';
    }
    this.position = $.isFunction(config.suggestBox.position) ? config.suggestBox.position : this.position;
    Box.apply(this, arguments);
  };
  inherits(SuggestBox, Box);

  SuggestBox.prototype.bindEvents = function() {
    var click = 'click.' + pluginName;
    this.container.on(click, this.onContainerClick.bind(this));
    this.container.on(click, '.ignore-word', selectWordHandler.call(this, 'ignore.word'));
    this.container.on(click, '.ignore-all', this.handler('ignore.all'));
    this.container.on(click, '.ignore-forever', this.handler('ignore.forever'));
    this.container.on(click, '.words a', selectWordHandler.call(this, 'select.word'));
    $('html').on(click, this.onWindowClick.bind(this));
    if (this.element[0].nodeName === 'BODY') {
      this.element.parent().on(click, this.onWindowClick.bind(this));
    }
  };

  SuggestBox.prototype.createBox = function() {

    var local = this.config.local;

    this.container = $([
      '<div class="' + pluginName + '-suggestbox">',
      ' <div class="footer">',
      '   <a href="#" class="ignore-word">' + local.ignoreWord + '</a>',
      '   <a href="#" class="ignore-all">' + local.ignoreAll + '</a>',
      '   <a href="#" class="ignore-forever">' + local.ignoreForever + '</a>',
      ' </div>',
      '</div>'
    ].join('')).appendTo(this.body);

    this.words = $([
      '<div class="words">',
      '</div>'
    ].join('')).prependTo(this.container);

    this.loadingMsg = $([
      '<div class="loading">',
      this.config.local.loading,
      '</div>'
    ].join(''));

    this.footer = this.container.find('.footer').hide();
  };

  SuggestBox.prototype.addWords = function(words) {

    var html;

    if (!words.length) {
      html = '<em>' + this.config.local.noSuggestions + '</em>';
    } else {
      html = $.map(words, function(word) {
        return '<a href="#">' + word + '</a>';
      }).slice(0, this.config.suggestBox.numWords).join('');
    }

    this.words.html(html);
  };

  SuggestBox.prototype.showSuggestedWords = function(getWords, word, wordElement) {
    this.wordElement = $(wordElement);
    getWords(word, this.onGetWords.bind(this));
  };

  SuggestBox.prototype.loading = function(show) {
    this.footer.hide();
    this.words.html(show ? this.loadingMsg.clone() : '');
    this.position();
    this.open();
  };

  SuggestBox.prototype.position = function() {

    var win = $(window);
    var element = this.wordElement.data('firstElement') || this.wordElement;
    var offset = element.offset();
    var boxOffset = this.config.suggestBox.offset;
    var containerHeight = this.container.outerHeight();

    var positionAbove = (offset.top - containerHeight - boxOffset);
    var positionBelow = (offset.top + element.outerHeight() + boxOffset);

    var left = offset.left;
    var top;

    if (this.config.suggestBox.position === 'below') {
      top = positionBelow;
      if (win.height() + win.scrollTop() < positionBelow + containerHeight) {
        top = positionAbove;
      }
    } else {
      top = positionAbove;
    }

    this.container.css({ top: top, left: left });
  };

  SuggestBox.prototype.open = function() {
    this.position();
    this.container.fadeIn(180);
  };

  SuggestBox.prototype.close = function() {
    this.container.fadeOut(100, function(){
      this.footer.hide();
    }.bind(this));
  };

  SuggestBox.prototype.detach = function() {
    this.container = this.container.detach();
  };

  SuggestBox.prototype.reattach = function() {
    this.container.appendTo(this.body);
  };

  SuggestBox.prototype.onContainerClick = function(e) {
    e.stopPropagation();
  };

  SuggestBox.prototype.onWindowClick = function(e) {
    this.close();
  };

  SuggestBox.prototype.onGetWords = function(words) {
    this.addWords(words);
    this.footer.show();
    this.position();
    this.open();
  };

  SuggestBox.prototype.destroy = function() {
    this.container.empty().remove();
  };

  /* Spellchecker web service
   *************************/

  var WebService = function(config) {

    this.config = config;

    this.defaultConfig = {
      url: config.webservice.path,
      type: 'POST',
      dataType: 'json',
      cache: false,
      data: {
        lang: config.lang,
        driver: config.webservice.driver
      },
      error: function() {
        //MODIFIED BY Kirk Spencer
        if ($('.spell_checker_dialog').size() === 1 && $('.spell_checker_dialog').dialog) {
          $('.dialog').html(config.local.requestError).dialog({
            width: 300,
            height: 175,
            title: 'Error!',
            modal: true,
            "buttons": [{
              text: "OK",
              click: function() {
                $(this).dialog("close");
              }
            }]
          });
        } else {
          alert(config.local.requestError);
        }
        //End MODIFIED BY Kirk Spencer
      }.bind(this)
    };
  };

  WebService.prototype.makeRequest = function(config) {

    var defaultConfig = $.extend(true, {}, this.defaultConfig);

    return $.ajax($.extend(true, defaultConfig, config));
  };

  WebService.prototype.checkWords = function(text, callback) {
    return this.makeRequest({
      data: {
        action: 'get_incorrect_words',
        text: text
      },
      success: callback
    });
  };

  WebService.prototype.getSuggestions = function(word, callback) {
    //MODIFIED BY Castle-IT
    return this.makeRequest({
      url: this.config.webservice.suggestionPath || this.config.webservice.path,
      data: {
        action: 'get_suggestions',
        word: word
      },
      success: callback
    });
    //MODIFIED BY Castle-IT
  };

  /* Spellchecker base parser
   *************************/

  var Parser = function(elements, findAndReplaceDOMText, config) {
    this.elements = elements;
    this.findAndReplaceDOMText = findAndReplaceDOMText;
    this.replacementContainer = null;
    this.config = config;
  };

  Parser.prototype.clean = function(text) {

    text = '' + text; // Typecast to string
    text = decode(text); // Decode HTML characters
    text = text.replace(/\xA0|\s+|(&nbsp;)/mg, ' '); // Convert whitespace
    text = text.replace(new RegExp('<[^>]+>', 'g'), ''); // Strip HTML tags

    var puncExpr = [
      '(^|\\s+)[' + punctuationChars + ']+',                        // punctuation(s) with leading whitespace(s)
      '[' + punctuationChars + ']+\\s+[' + punctuationChars + ']+', // punctuation(s) with leading and trailing whitespace(s)
      '[' + punctuationChars + ']+(\\s+|$)'                         // puncutation(s) with trailing whitespace(s)
    ].join('|');

    text = text.replace(new RegExp(puncExpr, 'g'), ' '); // strip any punctuation
    text = $.trim(text.replace(/\s{2,}/g, ' '));         // remove extra whitespace

    // Remove numbers
    text = $.map(text.split(' '), function(word) {
      return (/^\d+$/.test(word)) ? null : word;
    }).join(' ');

    return text;
  };

  /* Spellchecker text parser
   *************************/

  var TextParser = function() {
    Parser.apply(this, arguments);
  };
  inherits(TextParser, Parser);

  TextParser.prototype.getText = function(text, textGetter) {
    return $.map(this.elements, function(element) {
      return this.clean(textGetter ? textGetter(element) : $(element).val());
    }.bind(this));
  };

  TextParser.prototype.replaceWordInText = function(oldWord, newWord, text) {
    //MODIFIED BY Kirk Spencer
    var regex = new RegExp('\\b(' + RegExp.escape(oldWord) + ')\\b', 'g');
    //End MODIFIED BY Kirk Spencer
    return (text + '').replace(regex, '$1' + newWord);
  };

  TextParser.prototype.replaceWord = function(oldWord, replacement, element) {
    element = $(element);
    var newText = this.replaceWordInText(oldWord, replacement, element.val());
    element.val(newText);
  };

  /* Spellchecker html parser
   *************************/

  var HtmlParser = function() {
    Parser.apply(this, arguments);
  };
  inherits(HtmlParser, Parser);

  HtmlParser.prototype.getText = function(text, textGetter) {
    if (text && (text = $(text)).length) {
      return this.clean(text.text());
    }
    return $.map(this.elements, function(element) {

      if (textGetter) {
        text = textGetter(element);
      } else {
        text = $(element)
            .clone()
            .find('[class^="spellchecker-"]')
            .remove()
            .end()
            .text();
      }

      return this.clean(text);

    }.bind(this));
  };

  HtmlParser.prototype.replaceText = function(regExp, element, replaceText, captureGroup) {
     this.replacementContainer = this.findAndReplaceDOMText(element,
        {
          find: regExp,
          replace: replaceText,
          filterElements: this.config.filterElements
        });
  };

  HtmlParser.prototype.replaceWord = function(oldWord, replacement, element) {

    try {
      this.replacementContainer.revert();
    } catch(e) {}

    //MODIFIED BY Kirk Spencer
    var regExp = new RegExp('\\b(' + RegExp.escape(oldWord) + ')\\b', 'g');
    //End MODIFIED BY Kirk Spencer

    this.replaceText(regExp, element[0], this.replaceTextHandler(oldWord, replacement), 2);

    // Remove this word from the list of incorrect words
    this.incorrectWords = $.map(this.incorrectWords || [], function(word) {
      return word === oldWord ? null : word;
    });

    this.highlightWords(this.incorrectWords, element);
  };

  HtmlParser.prototype.replaceTextHandler = function(oldWord, replacement){

    var r = replacement;
    var replaced;
    var replaceFill;
    var c;

    return function(fill, i) {

      // Reset the replacement for each match
      if (i !== c) {
        c = i;
        replacement = r;
        replaced = '';
      }

      replaceFill = replacement.substring(0, fill.length);
      replacement = replacement.substr(fill.length);
      replaced += fill;

      // Add remaining text to last node
      if (replaced === oldWord) {
        replaceFill += replacement;
      }

      return document.createTextNode(replaceFill);
    };
  };

  HtmlParser.prototype.highlightWords = function(incorrectWords, element) {
    if (!incorrectWords.length) {
      return;
    }

    this.incorrectWords = incorrectWords;
    incorrectWords = $.map(incorrectWords, function(word) {
      return RegExp.escape(word);
    });

    //MODIFIED BY Kirk Spencer
    var regExp = new RegExp('\\b(' + incorrectWords.join('|') + ')\\b', 'g');
    this.replaceText(regExp, element[0], this.highlightWordsHandler(incorrectWords), 2);
    //End MODIFIED BY Kirk Spencer
  };

  HtmlParser.prototype.highlightWordsHandler = function(incorrectWords) {

    var c;
    var replaceElement;

    return function(fill, i, word) {

      // Replacement node
      var span = $('<span />', {
        'class': pluginName + '-word-highlight'
      });

      // If we have a new match
      if (i !== c) {
        c = i;
        replaceElement = span;
      }

      span
          .text(fill.text)
          .data({
            'firstElement': replaceElement,
            'word': fill.text
          });

      return span[0];
    };
  };

  HtmlParser.prototype.ignoreWord = function(oldWord, replacement) {
    this.replaceWord(oldWord, replacement);
  };

  /* Spellchecker
   *************************/

  var SpellChecker = function(elements, config) {

    Events.call(this);

    this.elements = $(elements).attr('spellcheck', 'false');
    //this.config = $.extend(true, defaultConfig, config);

    var defaultConfigCopy = $.extend(true, {}, defaultConfig);
    this.config = $.extend(true, defaultConfigCopy, config);

    this.findAndReplaceDOMText = findAndReplaceDOMText;
    this.setupWebService();
    this.setupParser();

    if (this.elements.length) {
      this.setupSuggestBox();
      this.setupIncorrectWords();
      this.bindEvents();
    }
  };
  inherits(SpellChecker, Events);

  SpellChecker.prototype.setupWebService = function() {
    this.webservice = new WebService(this.config);
  };

  SpellChecker.prototype.setupSuggestBox = function() {

    this.suggestBox = new SuggestBox(this.config, this.elements);

    this.on('replace.word.before', function() {
      this.suggestBox.close();
      this.suggestBox.detach();
    }.bind(this));

    this.on('replace.word', function() {
      this.suggestBox.reattach();
    }.bind(this));

    this.on('destroy', function() {
      this.suggestBox.destroy();
    }.bind(this));
  };

  SpellChecker.prototype.setupIncorrectWords = function() {

    var findAndReplaceDOMText = this.findAndReplaceDOMText;
    this.incorrectWords = new Collection(this.elements, function(element) {
      return this.config.parser === 'html' ?
          new IncorrectWordsInline(this.config, this.parser, element, findAndReplaceDOMText) :
          new IncorrectWordsBox(this.config, this.parser, element, findAndReplaceDOMText);
    }.bind(this));

    this.on('replace.word', function(index) {
      this.incorrectWords.get(index).removeWord(this.incorrectWordElement);
    }.bind(this));

    this.on('destroy', function() {
      this.incorrectWords.destroy();
    }, this);
  };

  SpellChecker.prototype.setupParser = function() {
    this.parser = this.config.parser === 'html' ?
        new HtmlParser(this.elements, this.findAndReplaceDOMText, this.config) :
        new TextParser(this.elements, this.findAndReplaceDOMText, this.config);
  };

  SpellChecker.prototype.bindEvents = function() {
    this.on('check.fail', this.onCheckFail.bind(this));
    this.suggestBox.on('ignore.word', this.onIgnoreWord.bind(this));
    this.suggestBox.on('select.word', this.onSelectWord.bind(this));
    this.incorrectWords.on('select.word', this.onIncorrectWordSelect.bind(this));
  };

  /* Pubic API methods */

  SpellChecker.prototype.check = function(text, callback) {
    this.trigger('check.start');
    text = typeof text === 'string' ? this.parser.clean(text) : this.parser.getText(text || '', this.config.getText);
    //MODIFIED BY Kirk Spencer
    text += ''; // Typecast to string
    //End MODIFIED BY Kirk Spencer
    this.webservice.checkWords(text, this.onCheckWords(callback));
  };

  SpellChecker.prototype.getSuggestions = function(word, callback) {
    if (this.suggestBox) {
      this.suggestBox.loading(true);
    }
    this.webservice.getSuggestions(word, callback);
  };

  SpellChecker.prototype.replaceWord = function(oldWord, replacement, elementOrText) {

    if (typeof elementOrText === 'string') {
      return this.parser.replaceWordInText(oldWord, replacement, elementOrText);
    }

    var element = elementOrText || this.spellCheckerElement;
    var index = this.elements.index(element);

    this.trigger('replace.word.before');
    this.parser.replaceWord(oldWord, replacement, element);
    this.trigger('replace.word', index);
  };

  SpellChecker.prototype.destroy = function() {
    this.trigger('destroy');
  };

  /* Event handlers */

  SpellChecker.prototype.onCheckWords = function(callback) {

    return function(data) {

      var incorrectWords = data.data;
      var outcome = 'success';

      $.each(incorrectWords, function(i, words) {
        if (words.length) {
          outcome = 'fail';
          return false;
        }
      });

      this.trigger('check.complete');
      this.trigger('check.' + outcome, incorrectWords);
      this.trigger(callback, incorrectWords);

    }.bind(this);
  };

  SpellChecker.prototype.onCheckFail = function(badWords) {
    this.suggestBox.detach();
    $.each(badWords, function(i, words) {
      if (words.length) {
        // Make array unique
        words = $.grep(words, function(el, index){
          return index === $.inArray(el, words);
        });
        this.incorrectWords.get(i).addWords(words);
      }
    }.bind(this));
    this.suggestBox.reattach();
  };

  SpellChecker.prototype.onSelectWord = function(e, word, element) {
    e.preventDefault();
    this.replaceWord(this.incorrectWord, word);
  };

  SpellChecker.prototype.onIgnoreWord = function(e, word, element) {
    e.preventDefault();
    this.replaceWord(this.incorrectWord, this.incorrectWord);
  };

  SpellChecker.prototype.onIncorrectWordSelect = function(e, word, element, incorrectWords) {
    e.preventDefault();
    this.incorrectWord = word;
    this.incorrectWordElement = element;
    this.spellCheckerElement = incorrectWords.spellCheckerElement;
    this.spellCheckerIndex = this.elements.index(this.spellCheckerElement);
    this.suggestBox.showSuggestedWords(this.getSuggestions.bind(this), word, element);
    this.trigger('select.word', e);
  };

  $.SpellChecker = SpellChecker;


}(this, jQuery));

(function (root, factory) {
     if (typeof module === 'object' && module.exports) {
         // Node/CommonJS
         module.exports = factory();
     } else if (typeof define === 'function' && define.amd) {
         // AMD. Register as an anonymous module.
         define(factory);
     } else {
         // Browser globals
         root.findAndReplaceDOMText = factory();
     }
 }(this, function factory() {

	var PORTION_MODE_RETAIN = 'retain';
	var PORTION_MODE_FIRST = 'first';

	var doc = document;
	var toString = {}.toString;
	var hasOwn = {}.hasOwnProperty;

	function isArray(a) {
		return toString.call(a) == '[object Array]';
	}

	function escapeRegExp(s) {
		return String(s).replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');
	}

	function exposed() {
		// Try deprecated arg signature first:
		return deprecated.apply(null, arguments) || findAndReplaceDOMText.apply(null, arguments);
	}

	function deprecated(regex, node, replacement, captureGroup, elFilter) {
		if ((node && !node.nodeType) && arguments.length <= 2) {
			return false;
		}
		var isReplacementFunction = typeof replacement == 'function';

		if (isReplacementFunction) {
			replacement = (function(original) {
				return function(portion, match) {
					return original(portion.text, match.startIndex);
				};
			}(replacement));
		}

		// Awkward support for deprecated argument signature (<0.4.0)
		var instance = findAndReplaceDOMText(node, {

			find: regex,

			wrap: isReplacementFunction ? null : replacement,
			replace: isReplacementFunction ? replacement : '$' + (captureGroup || '&'),

			prepMatch: function(m, mi) {

				// Support captureGroup (a deprecated feature)

				if (!m[0]) throw 'findAndReplaceDOMText cannot handle zero-length matches';

				if (captureGroup > 0) {
					var cg = m[captureGroup];
					m.index += m[0].indexOf(cg);
					m[0] = cg;
				}
		 
				m.endIndex = m.index + m[0].length;
				m.startIndex = m.index;
				m.index = mi;

				return m;
			},
			filterElements: elFilter
		});

		exposed.revert = function() {
			return instance.revert();
		};

		return true;
	}

	/** 
	 * findAndReplaceDOMText
	 * 
	 * Locates matches and replaces with replacementNode
	 *
	 * @param {Node} node Element or Text node to search within
	 * @param {RegExp} options.find The regular expression to match
	 * @param {String|Element} [options.wrap] A NodeName, or a Node to clone
	 * @param {String|Function} [options.replace='$&'] What to replace each match with
	 * @param {Function} [options.filterElements] A Function to be called to check whether to
	 *	process an element. (returning true = process element,
	 *	returning false = avoid element)
	 */
	function findAndReplaceDOMText(node, options) {
		return new Finder(node, options);
	}

	exposed.NON_PROSE_ELEMENTS = {
		br:1, hr:1,
		// Media / Source elements:
		script:1, style:1, img:1, video:1, audio:1, canvas:1, svg:1, map:1, object:1,
		// Input elements
		input:1, textarea:1, select:1, option:1, optgroup: 1, button:1
	};

	exposed.NON_CONTIGUOUS_PROSE_ELEMENTS = {

		// Elements that will not contain prose or block elements where we don't
		// want prose to be matches across element borders:

		// Block Elements
		address:1, article:1, aside:1, blockquote:1, dd:1, div:1,
		dl:1, fieldset:1, figcaption:1, figure:1, footer:1, form:1, h1:1, h2:1, h3:1,
		h4:1, h5:1, h6:1, header:1, hgroup:1, hr:1, main:1, nav:1, noscript:1, ol:1,
		output:1, p:1, pre:1, section:1, ul:1,
		// Other misc. elements that are not part of continuous inline prose:
		br:1, li: 1, summary: 1, dt:1, details:1, rp:1, rt:1, rtc:1,
		// Media / Source elements:
		script:1, style:1, img:1, video:1, audio:1, canvas:1, svg:1, map:1, object:1,
		// Input elements
		input:1, textarea:1, select:1, option:1, optgroup: 1, button:1,
		// Table related elements:
		table:1, tbody:1, thead:1, th:1, tr:1, td:1, caption:1, col:1, tfoot:1, colgroup:1

	};

	exposed.NON_INLINE_PROSE = function(el) {
		return hasOwn.call(exposed.NON_CONTIGUOUS_PROSE_ELEMENTS, el.nodeName.toLowerCase());
	};

	// Presets accessed via `options.preset` when calling findAndReplaceDOMText():
	exposed.PRESETS = {
		prose: {
			forceContext: exposed.NON_INLINE_PROSE,
			filterElements: function(el) {
				return !hasOwn.call(exposed.NON_PROSE_ELEMENTS, el.nodeName.toLowerCase());
			}
		}
	};

	exposed.Finder = Finder;

	/**
	 * Finder -- encapsulates logic to find and replace.
	 */
	function Finder(node, options) {

		var preset = options.preset && exposed.PRESETS[options.preset];

		options.portionMode = options.portionMode || PORTION_MODE_RETAIN;

		if (preset) {
			for (var i in preset) {
				if (hasOwn.call(preset, i) && !hasOwn.call(options, i)) {
					options[i] = preset[i];
				}
			}
		}

		this.node = node;
		this.options = options;

		// ENable match-preparation method to be passed as option:
		this.prepMatch = options.prepMatch || this.prepMatch;

		this.reverts = [];

		this.matches = this.search();

		if (this.matches.length) {
			this.processMatches();
		}

	}

	Finder.prototype = {

		/**
		 * Searches for all matches that comply with the instance's 'match' option
		 */
		search: function() {

			var match;
			var matchIndex = 0;
			var offset = 0;
			var regex = this.options.find;
			var textAggregation = this.getAggregateText();
			var matches = [];
			var self = this;

			regex = typeof regex === 'string' ? RegExp(escapeRegExp(regex), 'g') : regex;

			matchAggregation(textAggregation);

			function matchAggregation(textAggregation) {
				for (var i = 0, l = textAggregation.length; i < l; ++i) {

					var text = textAggregation[i];

					if (typeof text !== 'string') {
						// Deal with nested contexts: (recursive)
						matchAggregation(text);
						continue;
					}

					if (regex.global) {
						while (match = regex.exec(text)) {
							matches.push(self.prepMatch(match, matchIndex++, offset));
						}
					} else {
						if (match = text.match(regex)) {
							matches.push(self.prepMatch(match, 0, offset));
						}
					}

					offset += text.length;
				}
			}

			return matches;

		},

		/**
		 * Prepares a single match with useful meta info:
		 */
		prepMatch: function(match, matchIndex, characterOffset) {

			if (!match[0]) {
				throw new Error('findAndReplaceDOMText cannot handle zero-length matches');
			}
	 
			match.endIndex = characterOffset + match.index + match[0].length;
			match.startIndex = characterOffset + match.index;
			match.index = matchIndex;

			return match;
		},

		/**
		 * Gets aggregate text within subject node
		 */
		getAggregateText: function() {

			var elementFilter = this.options.filterElements;
			var forceContext = this.options.forceContext;

			return getText(this.node);

			/**
			 * Gets aggregate text of a node without resorting
			 * to broken innerText/textContent
			 */
			function getText(node, txt) {

				if (node.nodeType === 3) {
					return [node.data];
				}

				if (elementFilter && !elementFilter(node)) {
					return [];
				}

				var txt = [''];
				var i = 0;

				if (node = node.firstChild) do {

					if (node.nodeType === 3) {
						txt[i] += node.data;
						continue;
					}

					var innerText = getText(node);

					if (
						forceContext &&
						node.nodeType === 1 &&
						(forceContext === true || forceContext(node))
					) {
						txt[++i] = innerText;
						txt[++i] = '';
					} else {
						if (typeof innerText[0] === 'string') {
							// Bridge nested text-node data so that they're
							// not considered their own contexts:
							// I.e. ['some', ['thing']] -> ['something']
							txt[i] += innerText.shift();
						}
						if (innerText.length) {
							txt[++i] = innerText;
							txt[++i] = '';
						}
					}
				} while (node = node.nextSibling);

				return txt;

			}
			
		},

		/** 
		 * Steps through the target node, looking for matches, and
		 * calling replaceFn when a match is found.
		 */
		processMatches: function() {

			var matches = this.matches;
			var node = this.node;
			var elementFilter = this.options.filterElements;

			var startPortion,
				endPortion,
				innerPortions = [],
				curNode = node,
				match = matches.shift(),
				atIndex = 0, // i.e. nodeAtIndex
				matchIndex = 0,
				portionIndex = 0,
				doAvoidNode,
				nodeStack = [node];

			out: while (true) {

				if (curNode.nodeType === 3) {

					if (!endPortion && curNode.length + atIndex >= match.endIndex) {

						// We've found the ending
						endPortion = {
							node: curNode,
							index: portionIndex++,
							text: curNode.data.substring(match.startIndex - atIndex, match.endIndex - atIndex),
							indexInMatch: atIndex - match.startIndex,
							indexInNode: match.startIndex - atIndex, // always zero for end-portions
							endIndexInNode: match.endIndex - atIndex,
							isEnd: true
						};

					} else if (startPortion) {
						// Intersecting node
						innerPortions.push({
							node: curNode,
							index: portionIndex++,
							text: curNode.data,
							indexInMatch: atIndex - match.startIndex,
							indexInNode: 0 // always zero for inner-portions
						});
					}

					if (!startPortion && curNode.length + atIndex > match.startIndex) {
						// We've found the match start
						startPortion = {
							node: curNode,
							index: portionIndex++,
							indexInMatch: 0,
							indexInNode: match.startIndex - atIndex,
							endIndexInNode: match.endIndex - atIndex,
							text: curNode.data.substring(match.startIndex - atIndex, match.endIndex - atIndex)
						};
					}

					atIndex += curNode.data.length;

				}

				doAvoidNode = curNode.nodeType === 1 && elementFilter && !elementFilter(curNode);

				if (startPortion && endPortion) {

					curNode = this.replaceMatch(match, startPortion, innerPortions, endPortion);

					// processMatches has to return the node that replaced the endNode
					// and then we step back so we can continue from the end of the 
					// match:

					atIndex -= (endPortion.node.data.length - endPortion.endIndexInNode);

					startPortion = null;
					endPortion = null;
					innerPortions = [];
					match = matches.shift();
					portionIndex = 0;
					matchIndex++;

					if (!match) {
						break; // no more matches
					}

				} else if (
					!doAvoidNode &&
					(curNode.firstChild || curNode.nextSibling)
				) {
					// Move down or forward:
					if (curNode.firstChild) {
						nodeStack.push(curNode);
						curNode = curNode.firstChild;
					} else {
						curNode = curNode.nextSibling;
					}
					continue;
				}

				// Move forward or up:
				while (true) {
					if (curNode.nextSibling) {
						curNode = curNode.nextSibling;
						break;
					}
					curNode = nodeStack.pop();
					if (curNode === node) {
						break out;
					}
				}

			}

		},

		/**
		 * Reverts ... TODO
		 */
		revert: function() {
			// Reversion occurs backwards so as to avoid nodes subsequently
			// replaced during the matching phase (a forward process):
			for (var l = this.reverts.length; l--;) {
				this.reverts[l]();
			}
			this.reverts = [];
		},

		prepareReplacementString: function(string, portion, match, matchIndex) {
			var portionMode = this.options.portionMode;
			if (
				portionMode === PORTION_MODE_FIRST &&
				portion.indexInMatch > 0
			) {
				return '';
			}
			string = string.replace(/\$(\d+|&|`|')/g, function($0, t) {
				var replacement;
				switch(t) {
					case '&':
						replacement = match[0];
						break;
					case '`':
						replacement = match.input.substring(0, match.startIndex);
						break;
					case '\'':
						replacement = match.input.substring(match.endIndex);
						break;
					default:
						replacement = match[+t];
				}
				return replacement;
			});

			if (portionMode === PORTION_MODE_FIRST) {
				return string;
			}

			if (portion.isEnd) {
				return string.substring(portion.indexInMatch);
			}

			return string.substring(portion.indexInMatch, portion.indexInMatch + portion.text.length);
		},

		getPortionReplacementNode: function(portion, match, matchIndex) {

			var replacement = this.options.replace || '$&';
			var wrapper = this.options.wrap;

			if (wrapper && wrapper.nodeType) {
				// Wrapper has been provided as a stencil-node for us to clone:
				var clone = doc.createElement('div');
				clone.innerHTML = wrapper.outerHTML || new XMLSerializer().serializeToString(wrapper);
				wrapper = clone.firstChild;
			}

			if (typeof replacement == 'function') {
				replacement = replacement(portion, match, matchIndex);
				if (replacement && replacement.nodeType) {
					return replacement;
				}
				return doc.createTextNode(String(replacement));
			}

			var el = typeof wrapper == 'string' ? doc.createElement(wrapper) : wrapper;

			replacement = doc.createTextNode(
				this.prepareReplacementString(
					replacement, portion, match, matchIndex
				)
			);

			if (!replacement.data) {
				return replacement;
			}

			if (!el) {
				return replacement;
			}

			el.appendChild(replacement);

			return el;
		},

		replaceMatch: function(match, startPortion, innerPortions, endPortion) {

			var matchStartNode = startPortion.node;
			var matchEndNode = endPortion.node;

			var preceedingTextNode;
			var followingTextNode;

			if (matchStartNode === matchEndNode) {

				var node = matchStartNode;

				if (startPortion.indexInNode > 0) {
					// Add `before` text node (before the match)
					preceedingTextNode = doc.createTextNode(node.data.substring(0, startPortion.indexInNode));
					node.parentNode.insertBefore(preceedingTextNode, node);
				}

				// Create the replacement node:
				var newNode = this.getPortionReplacementNode(
					endPortion,
					match
				);

				node.parentNode.insertBefore(newNode, node);

				if (endPortion.endIndexInNode < node.length) { // ?????
					// Add `after` text node (after the match)
					followingTextNode = doc.createTextNode(node.data.substring(endPortion.endIndexInNode));
					node.parentNode.insertBefore(followingTextNode, node);
				}

				node.parentNode.removeChild(node);

				this.reverts.push(function() {
					if (preceedingTextNode === newNode.previousSibling) {
						preceedingTextNode.parentNode.removeChild(preceedingTextNode);
					}
					if (followingTextNode === newNode.nextSibling) {
						followingTextNode.parentNode.removeChild(followingTextNode);
					}
					newNode.parentNode.replaceChild(node, newNode);
				});

				return newNode;

			} else {
				// Replace matchStartNode -> [innerMatchNodes...] -> matchEndNode (in that order)


				preceedingTextNode = doc.createTextNode(
					matchStartNode.data.substring(0, startPortion.indexInNode)
				);

				followingTextNode = doc.createTextNode(
					matchEndNode.data.substring(endPortion.endIndexInNode)
				);

				var firstNode = this.getPortionReplacementNode(
					startPortion,
					match
				);

				var innerNodes = [];

				for (var i = 0, l = innerPortions.length; i < l; ++i) {
					var portion = innerPortions[i];
					var innerNode = this.getPortionReplacementNode(
						portion,
						match
					);
					portion.node.parentNode.replaceChild(innerNode, portion.node);
					this.reverts.push((function(portion, innerNode) {
						return function() {
							innerNode.parentNode.replaceChild(portion.node, innerNode);
						};
					}(portion, innerNode)));
					innerNodes.push(innerNode);
				}

				var lastNode = this.getPortionReplacementNode(
					endPortion,
					match
				);

				matchStartNode.parentNode.insertBefore(preceedingTextNode, matchStartNode);
				matchStartNode.parentNode.insertBefore(firstNode, matchStartNode);
				matchStartNode.parentNode.removeChild(matchStartNode);

				matchEndNode.parentNode.insertBefore(lastNode, matchEndNode);
				matchEndNode.parentNode.insertBefore(followingTextNode, matchEndNode);
				matchEndNode.parentNode.removeChild(matchEndNode);

				this.reverts.push(function() {
					preceedingTextNode.parentNode.removeChild(preceedingTextNode);
					firstNode.parentNode.replaceChild(matchStartNode, firstNode);
					followingTextNode.parentNode.removeChild(followingTextNode);
					lastNode.parentNode.replaceChild(matchEndNode, lastNode);
				});

				return lastNode;
			}
		}

	};

	return exposed;

}));
