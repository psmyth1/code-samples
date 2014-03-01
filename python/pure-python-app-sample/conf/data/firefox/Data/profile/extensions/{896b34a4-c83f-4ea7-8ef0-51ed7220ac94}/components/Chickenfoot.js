// Copyright 2006 Google Inc.
// All Rights Reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 
//  * Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
//  * Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in
//    the documentation and/or other materials provided with the
//    distribution.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
// INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
// BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
// LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
// ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE. 

/**
 * @fileoverview Bootstrap for the Google JS Library (Closure)  Also includes
 * stuff taken from //depot/google3/javascript/lang.js.
 */

/**
 * @define {boolean} Overridden to true by the compiler when --closure_pass
 *     or --mark_as_compiled is specified.
 */
var COMPILED = false;


/**
 * Base namespace for the Closure library.  Checks to see goog is
 * already defined in the current scope before assigning to prevent
 * clobbering if base.js is loaded more than once.
 */
var goog = goog || {}; // Check to see if already defined in current scope


/**
 * Reference to the global context.  In most cases this will be 'window'.
 */
goog.global = this;


/**
 * @define {boolean} DEBUG is provided as a convenience so that debugging code
 * that should not be included in a production js_binary can be easily stripped
 * by specifying --define goog.DEBUG=false to the JSCompiler. For example, most
 * toString() methods should be declared inside an "if (goog.DEBUG)" conditional
 * because they are generally used for debugging purposes and it is difficult
 * for the JSCompiler to statically determine whether they are used.
 */
goog.DEBUG = true;


/**
 * @define {string} LOCALE defines the locale being used for compilation. It is
 * used to select locale specific data to be compiled in js binary. BUILD rule
 * can specify this value by "--define goog.LOCALE=<locale_name>" as JSCompiler
 * option.
 *
 * Take into account that the locale code format is important. You should use
 * the canonical Unicode format with hyphen as a delimiter. Language must be
 * lowercase, Language Script - Capitalized, Region - UPPERCASE.
 * There are few examples: pt-BR, en, en-US, sr-Latin-BO, zh-Hans-CN.
 *
 * See more info about locale codes here:
 * http://www.unicode.org/reports/tr35/#Unicode_Language_and_Locale_Identifiers
 *
 * For language codes you should use values defined by ISO 693-1. See it here
 * http://www.w3.org/WAI/ER/IG/ert/iso639.htm. There is only one exception from
 * this rule: the Hebrew language. For legacy reasons the old code (iw) should
 * be used instead of the new code (he), see http://wiki/Main/IIISynonyms.
 */
goog.LOCALE = 'en';  // default to en


/**
 * Indicates whether or not we can call 'eval' directly to eval code in the
 * global scope. Set to a Boolean by the first call to goog.globalEval (which
 * empirically tests whether eval works for globals). @see goog.globalEval
 * @type {boolean?}
 * @private
 */
goog.evalWorksForGlobals_ = null;


/**
 * Creates object stubs for a namespace. When present in a file, goog.provide
 * also indicates that the file defines the indicated object. Calls to
 * goog.provide are resolved by the compiler if --closure_pass is set.
 * @param {string} name name of the object that this file defines.
 * @param {Object} opt_objectToExportTo The object to add the path to; default
 *     is |goog.global|.
 */
goog.provide = function(name, opt_objectToExportTo) {
  if (!COMPILED) {
    // Ensure that the same namespace isn't provided twice. This is intended
    // to teach new developers that 'goog.provide' is effectively a variable
    // declaration. And when JSCompiler transforms goog.provide into a real
    // variable declaration, the compiled JS should work the same as the raw
    // JS--even when the raw JS uses goog.provide incorrectly.
    if (goog.getObjectByName(name) && !goog.implicitNamespaces_[name]) {
      throw Error('Namespace "' + name + '" already declared.');
    }

    var namespace = name;
    while ((namespace = namespace.substring(0, namespace.lastIndexOf('.')))) {
      goog.implicitNamespaces_[namespace] = true;
    }
  }

  goog.exportPath_(name, undefined /* opt_object */, opt_objectToExportTo);
};


if (!COMPILED) {
  /**
   * Namespaces implicitly defined by goog.provide. For example,
   * goog.provide('goog.events.Event') implicitly declares
   * that 'goog' and 'goog.events' must be namespaces.
   *
   * @type {Object}
   * @private
   */
  goog.implicitNamespaces_ = {};
}


/**
 * Builds an object structure for the provided namespace path,
 * ensuring that names that already exist are not overwritten. For
 * example:
 * "a.b.c" -> a = {};a.b={};a.b.c={};
 * Used by goog.provide and goog.exportSymbol.
 * @param {string} name name of the object that this file defines.
 * @param {Object} opt_object the object to expose at the end of the path.
 * @param {Object} opt_objectToExportTo The object to add the path to; default
 *     is |goog.global|.
 * @private
 */
goog.exportPath_ = function(name, opt_object, opt_objectToExportTo) {
  var parts = name.split('.');
  var cur = opt_objectToExportTo || goog.global;
  var part;

  // Internet Explorer exhibits strange behavior when throwing errors from
  // methods externed in this manner.  See the testExportSymbolExceptions in
  // base_test.html for an example.
  if (!(parts[0] in cur) && cur.execScript) {
    cur.execScript('var ' + parts[0]);
  }

  // Parentheses added to eliminate strict JS warning in Firefox.
  while (parts.length && (part = parts.shift())) {
    if (!parts.length && goog.isDef(opt_object)) {
      // last part and we have an object; use it
      cur[part] = opt_object;
    } else if (cur[part]) {
      cur = cur[part];
    } else {
      cur = cur[part] = {};
    }
  }
};


/**
 * Returns an object based on its fully qualified external name.  If you are
 * using a compilation pass that renames property names beware that using this
 * function will not find renamed properties.
 *
 * @param {string} name The fully qualified name.
 * @param {Object} opt_obj The object within which to look; default is
 *     |goog.global|.
 * @return {Object?} The object or, if not found, null.
 */
goog.getObjectByName = function(name, opt_obj) {
  var parts = name.split('.');
  var cur = opt_obj || goog.global;
  for (var part; part = parts.shift(); ) {
    if (cur[part]) {
      cur = cur[part];
    } else {
      return null;
    }
  }
  return cur;
};


/**
 * Globalizes a whole namespace, such as goog or goog.lang.
 *
 * @param {Object} obj The namespace to globalize.
 * @param {Object} opt_global The object to add the properties to.
 * @deprecated Properties may be explicitly exported to the global scope, but
 *     this should no longer be done in bulk.
 */
goog.globalize = function(obj, opt_global) {
  var global = opt_global || goog.global;
  for (var x in obj) {
    global[x] = obj[x];
  }
};


/**
 * Adds a dependency from a file to the files it requires.
 * @param {string} relPath The path to the js file.
 * @param {Array} provides An array of strings with the names of the objects
 *                         this file provides.
 * @param {Array} requires An array of strings with the names of the objects
 *                         this file requires.
 */
goog.addDependency = function(relPath, provides, requires) {
  if (!COMPILED) {
    var provide, require;
    var path = relPath.replace(/\\/g, '/');
    var deps = goog.dependencies_;
    for (var i = 0; provide = provides[i]; i++) {
      deps.nameToPath[provide] = path;
      if (!(path in deps.pathToNames)) {
        deps.pathToNames[path] = {};
      }
      deps.pathToNames[path][provide] = true;
    }
    for (var j = 0; require = requires[j]; j++) {
      if (!(path in deps.requires)) {
        deps.requires[path] = {};
      }
      deps.requires[path][require] = true;
    }
  }
};


/**
 * Implements a system for the dynamic resolution of dependencies
 * that works in parallel with the BUILD system. Note that all calls
 * to goog.require will be stripped by the JSCompiler when the
 * --closure_pass option is used.
 * @param {string} rule Rule to include, in the form goog.package.part.
 */
goog.require = function(rule) {

  // if the object already exists we do not need do do anything
  if (!COMPILED) {
    if (goog.getObjectByName(rule)) {
      return;
    }
    var path = goog.getPathFromDeps_(rule);
    if (path) {
      goog.included_[path] = true;
      goog.writeScripts_();
    } else {
      // NOTE(nicksantos): We could always throw an error, but this would break
      // legacy users that depended on this failing silently. Instead, the
      // compiler should warn us when there are invalid goog.require calls.
      // For now, we simply give clients a way to turn strict mode on.
      if (goog.useStrictRequires) {
        throw new Error('goog.require could not find: ' + rule);
      }
    }
  }
};


/**
 * Whether goog.require should throw an exception if it fails.
 * @type {boolean}
 */
goog.useStrictRequires = false;


/**
 * Path for included scripts
 * @type {string}
 */
goog.basePath = '';


/**
 * Null function used for default values of callbacks, etc.
 * @type {!Function}
 */
goog.nullFunction = function() {};


/**
 * The identity function. Returns its first argument.
 *
 * @param {*} var_args The arguments of the function.
 * @return {*} The first argument.
 * @deprecated Use goog.functions.identity instead.
 */
goog.identityFunction = function(var_args) {
  return arguments[0];
};


/**
 * When defining a class Foo with an abstract method bar(), you can do:
 *
 * Foo.prototype.bar = goog.abstractMethod
 *
 * Now if a subclass of Foo fails to override bar(), an error
 * will be thrown when bar() is invoked.
 *
 * Note: This does not take the name of the function to override as
 * an argument because that would make it more difficult to obfuscate
 * our JavaScript code.
 *
 * @throws {Error} when invoked to indicate the method should be
 *   overridden.
 */
goog.abstractMethod = function() {
  throw Error('unimplemented abstract method');
};


/**
 * Adds a {@code getInstance} static method that always return the same instance
 * object.
 * @param {!Function} ctor The constructor for the class to add the static
 *     method to.
 */
goog.addSingletonGetter = function(ctor) {
  ctor.getInstance = function() {
    return ctor.instance_ || (ctor.instance_ = new ctor());
  };
};


if (!COMPILED) {
  /**
   * Object used to keep track of urls that have already been added. This
   * record allows the prevention of circular dependencies.
   * @type {Object}
   * @private
   */
  goog.included_ = {};


  /**
   * This object is used to keep track of dependencies and other data that is
   * used for loading scripts
   * @private
   * @type {Object}
   */
  goog.dependencies_ = {
    pathToNames: {}, // 1 to many
    nameToPath: {}, // 1 to 1
    requires: {}, // 1 to many
    visited: {}, // used when resolving dependencies to prevent us from
                 // visiting the file twice
    written: {} // used to keep track of script files we have written
  };


  /**
   * Tries to detect the base path of the base.js script that bootstraps Closure
   * @private
   */
  goog.findBasePath_ = function() {
    var doc = goog.global.document;
    if (typeof doc == 'undefined') {
      return;
    }
    if (goog.global.CLOSURE_BASE_PATH) {
      goog.basePath = goog.global.CLOSURE_BASE_PATH;
      return;
    } else {
      // HACKHACK to hide compiler warnings :(
      goog.global.CLOSURE_BASE_PATH = null;
    }
    var scripts = doc.getElementsByTagName('script');
    for (var script, i = 0; script = scripts[i]; i++) {
      var src = script.src;
      var l = src.length;
      if (src.substr(l - 7) == 'base.js') {
        goog.basePath = src.substr(0, l - 7);
        return;
      }
    }
  };


  /**
   * Writes a script tag if, and only if, that script hasn't already been added
   * to the document.  (Must be called at execution time)
   * @param {string} src Script source.
   * @private
   */
  goog.writeScriptTag_ = function(src) {
    var doc = goog.global.document;
    if (typeof doc != 'undefined' &&
        !goog.dependencies_.written[src]) {
      goog.dependencies_.written[src] = true;
      doc.write('<script type="text/javascript" src="' +
                src + '"></' + 'script>');
    }
  };


  /**
   * Resolves dependencies based on the dependencies added using addDependency
   * and calls writeScriptTag_ in the correct order.
   * @private
   */
  goog.writeScripts_ = function() {
    // the scripts we need to write this time
    var scripts = [];
    var seenScript = {};
    var deps = goog.dependencies_;

    function visitNode(path) {
      if (path in deps.written) {
        return;
      }

      // we have already visited this one. We can get here if we have cyclic
      // dependencies
      if (path in deps.visited) {
        if (!(path in seenScript)) {
          seenScript[path] = true;
          scripts.push(path);
        }
        return;
      }

      deps.visited[path] = true;

      if (path in deps.requires) {
        for (var requireName in deps.requires[path]) {
          if (requireName in deps.nameToPath) {
            visitNode(deps.nameToPath[requireName]);
          } else {
            throw Error('Undefined nameToPath for ' + requireName);
          }
        }
      }

      if (!(path in seenScript)) {
        seenScript[path] = true;
        scripts.push(path);
      }
    }

    for (var path in goog.included_) {
      if (!deps.written[path]) {
        visitNode(path);
      }
    }

    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i]) {
        goog.writeScriptTag_(goog.basePath + scripts[i]);
      } else {
        throw Error('Undefined script input');
      }
    }
  };


  /**
   * Looks at the dependency rules and tries to determine the script file that
   * fulfills a particular rule.
   * @param {string} rule In the form goog.namespace.Class or project.script.
   * @return {string?} Url corresponding to the rule, or null.
   * @private
   */
  goog.getPathFromDeps_ = function(rule) {
    if (rule in goog.dependencies_.nameToPath) {
      return goog.dependencies_.nameToPath[rule];
    } else {
      return null;
    }
  };

  // These do not work when loaded via XPCOM in Firefox.
  // goog.findBasePath_();
  // goog.writeScriptTag_(goog.basePath + 'deps.js');
}



//==============================================================================
// Language Enhancements
//==============================================================================


/**
 * This is a "fixed" version of the typeof operator.  It differs from the typeof
 * operator in such a way that null returns 'null' and arrays return 'array'.
 * @param {*} value The value to get the type of.
 * @return {string} The name of the type.
 */
goog.typeOf = function(value) {
  var s = typeof value;
  if (s == 'object') {
    if (value) {
      // We cannot use constructor == Array or instanceof Array because
      // different frames have different Array objects. In IE6, if the iframe
      // where the array was created is destroyed, the array loses its
      // prototype. Then dereferencing val.splice here throws an exception, so
      // we can't use goog.isFunction. Calling typeof directly returns 'unknown'
      // so that will work. In this case, this function will return false and
      // most array functions will still work because the array is still
      // array-like (supports length and []) even though it has lost its
      // prototype.
      // Mark Miller noticed that Object.prototype.toString
      // allows access to the unforgeable [[Class]] property.
      //  15.2.4.2 Object.prototype.toString ( )
      //  When the toString method is called, the following steps are taken:
      //      1. Get the [[Class]] property of this object.
      //      2. Compute a string value by concatenating the three strings
      //         "[object ", Result(1), and "]".
      //      3. Return Result(2).
      // and this behavior survives the destruction of the execution context.
      if (value instanceof Array ||  // Works quickly in same execution context.
          // If value is from a different execution context then
          // !(value instanceof Object), which lets us early out in the common
          // case when value is from the same context but not an array.
          // The {if (value)} check above means we don't have to worry about
          // undefined behavior of Object.prototype.toString on null/undefined.
          //
          // HACK: In order to use an Object prototype method on the arbitrary
          //   value, the compiler requires the value be cast to type Object,
          //   even though the ECMA spec explicitly allows it.
          (!(value instanceof Object) &&
             Object.prototype.toString.call(
                 /** @type {Object} */(value)) == '[object Array]')) {
        return 'array';
      }
      // HACK: There is still an array case that fails.
      //     function ArrayImpostor() {}
      //     ArrayImpostor.prototype = [];
      //     var impostor = new ArrayImpostor;
      // this can be fixed by getting rid of the fast path
      // (value instanceof Array) and solely relying on
      // (value && Object.prototype.toString.vall(value) === '[object Array]')
      // but that would require many more function calls and is not warranted
      // unless closure code is receiving objects from untrusted sources.

      // IE in cross-window calls does not correctly marshal the function type
      // (it appears just as an object) so we cannot use just typeof val ==
      // 'function'. However, if the object has a call property, it is a
      // function.
      if (typeof value.call != 'undefined') {
        return 'function';
      }
    } else {
      return 'null';
    }

  // In Safari typeof nodeList returns 'function', and on Firefox
  // typeof behaves similarly for HTML{Applet,Embed,Object}Elements
  // and RegExps.  We would like to return object for those and we can
  // detect an invalid function by making sure that the function
  // object has a call method.
  } else if (s == 'function' && typeof value.call == 'undefined') {
    return 'object';
  }
  return s;
};


/**
 * Safe way to test whether a property is enumarable.  It allows testing
 * for enumerable on objects where 'propertyIsEnumerable' is overridden or
 * does not exist (like DOM nodes in IE). Does not use browser native
 * Object.propertyIsEnumerable.
 * @param {Object} object The object to test if the property is enumerable.
 * @param {string} propName The property name to check for.
 * @return {boolean} True if the property is enumarable.
 * @private
 */
goog.propertyIsEnumerableCustom_ = function(object, propName) {
  // KJS in Safari 2 is not ECMAScript compatible and lacks crucial methods
  // such as propertyIsEnumerable.  We therefore use a workaround.
  // Does anyone know a more efficient work around?
  if (propName in object) {
    for (var key in object) {
      if (key == propName &&
          Object.prototype.hasOwnProperty.call(object, propName)) {
        return true;
      }
    }
  }
  return false;
};


/**
 * Safe way to test whether a property is enumarable.  It allows testing
 * for enumerable on objects where 'propertyIsEnumerable' is overridden or
 * does not exist (like DOM nodes in IE).
 * @param {Object} object The object to test if the property is enumerable.
 * @param {string} propName The property name to check for.
 * @return {boolean} True if the property is enumarable.
 * @private
 */
goog.propertyIsEnumerable_ = function(object, propName) {
  // In IE if object is from another window, cannot use propertyIsEnumerable
  // from this window's Object. Will raise a 'JScript object expected' error.
  if (object instanceof Object) {
    return Object.prototype.propertyIsEnumerable.call(object, propName);
  } else {
    return goog.propertyIsEnumerableCustom_(object, propName);
  }
};


/**
 * Returns true if the specified value is not |undefined|.
 * WARNING: Do not use this to test if an object has a property. Use the in
 * operator instead.
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is defined.
 */
goog.isDef = function(val) {
  return typeof val != 'undefined';
};


/**
 * Returns true if the specified value is |null|
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is null.
 */
goog.isNull = function(val) {
  return val === null;
};


/**
 * Returns true if the specified value is defined and not null
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is defined and not null.
 */
goog.isDefAndNotNull = function(val) {
  return goog.isDef(val) && !goog.isNull(val);
};


/**
 * Returns true if the specified value is an array
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is an array.
 */
goog.isArray = function(val) {
  return goog.typeOf(val) == 'array';
};


/**
 * Returns true if the object looks like an array. To qualify as array like
 * the value needs to be either a NodeList or an object with a Number length
 * property.
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is an array.
 */
goog.isArrayLike = function(val) {
  var type = goog.typeOf(val);
  return type == 'array' || type == 'object' && typeof val.length == 'number';
};


/**
 * Returns true if the object looks like a Date. To qualify as Date-like
 * the value needs to be an object and have a getFullYear() function.
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is a like a Date.
 */
goog.isDateLike = function(val) {
  return goog.isObject(val) && typeof val.getFullYear == 'function';
};


/**
 * Returns true if the specified value is a string
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is a string.
 */
goog.isString = function(val) {
  return typeof val == 'string';
};


/**
 * Returns true if the specified value is a boolean
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is boolean.
 */
goog.isBoolean = function(val) {
  return typeof val == 'boolean';
};


/**
 * Returns true if the specified value is a number
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is a number.
 */
goog.isNumber = function(val) {
  return typeof val == 'number';
};


/**
 * Returns true if the specified value is a function
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is a function.
 */
goog.isFunction = function(val) {
  return goog.typeOf(val) == 'function';
};


/**
 * Returns true if the specified value is an object.  This includes arrays
 * and functions.
 * @param {*} val Variable to test.
 * @return {boolean} Whether variable is an object.
 */
goog.isObject = function(val) {
  var type = goog.typeOf(val);
  return type == 'object' || type == 'array' || type == 'function';
};


/**
 * Adds a hash code field to an object. The hash code is unique for the
 * given object.
 * @param {Object} obj The object to get the hash code for.
 * @return {number} The hash code for the object.
 */
goog.getHashCode = function(obj) {
  // In IE, DOM nodes do not extend Object so they do not have this method.
  // we need to check hasOwnProperty because the proto might have this set.

  if (obj.hasOwnProperty && obj.hasOwnProperty(goog.HASH_CODE_PROPERTY_)) {
    return obj[goog.HASH_CODE_PROPERTY_];
  }
  if (!obj[goog.HASH_CODE_PROPERTY_]) {
    obj[goog.HASH_CODE_PROPERTY_] = ++goog.hashCodeCounter_;
  }
  return obj[goog.HASH_CODE_PROPERTY_];
};


/**
 * Removes the hash code field from an object.
 * @param {Object} obj The object to remove the field from.
 */
goog.removeHashCode = function(obj) {
  // DOM nodes in IE are not instance of Object and throws exception
  // for delete. Instead we try to use removeAttribute
  if ('removeAttribute' in obj) {
    obj.removeAttribute(goog.HASH_CODE_PROPERTY_);
  }
  /** @preserveTry */
  try {
    delete obj[goog.HASH_CODE_PROPERTY_];
  } catch (ex) {
  }
};


/**
 * {String} Name for hash code property
 * @private
 */
goog.HASH_CODE_PROPERTY_ = 'closure_hashCode_';


/**
 * @type {number} Counter for hash codes.
 * @private
 */
goog.hashCodeCounter_ = 0;


/**
 * Clone an object/array (recursively)
 * @param {Object} proto Object to clone.
 * @return {Object} Clone of x;.
 */
goog.cloneObject = function(proto) {
  var type = goog.typeOf(proto);
  if (type == 'object' || type == 'array') {
    if (proto.clone) {
      return proto.clone.call(proto);
    }
    var clone = type == 'array' ? [] : {};
    for (var key in proto) {
      clone[key] = goog.cloneObject(proto[key]);
    }
    return clone;
  }

  return proto;
};


/**
 * Forward declaration for the clone method. This is necessary until the
 * compiler can better support duck-typing constructs as used in
 * goog.cloneObject.
 *
 * @type {Function}
 */
Object.prototype.clone;


/**
 * Partially applies this function to a particular 'this object' and zero or
 * more arguments. The result is a new function with some arguments of the first
 * function pre-filled and the value of |this| 'pre-specified'.<br><br>
 *
 * Remaining arguments specified at call-time are appended to the pre-
 * specified ones.<br><br>
 *
 * Also see: {@link #partial}.<br><br>
 *
 * Note that bind and partial are optimized such that repeated calls to it do
 * not create more than one function object, so there is no additional cost for
 * something like:<br>
 *
 * <pre>var g = bind(f, obj);
 * var h = partial(g, 1, 2, 3);
 * var k = partial(h, a, b, c);</pre>
 *
 * Usage:
 * <pre>var barMethBound = bind(myFunction, myObj, 'arg1', 'arg2');
 * barMethBound('arg3', 'arg4');</pre>
 *
 * @param {Function} fn A function to partially apply.
 * @param {Object} selfObj Specifies the object which |this| should point to
 *     when the function is run. If the value is null or undefined, it will
 *     default to the global object.
 * @param {Object} var_args Additional arguments that are partially
 *     applied to the function.
 *
 * @return {!Function} A partially-applied form of the function bind() was
 *     invoked as a method of.
 */
goog.bind = function(fn, selfObj, var_args) {
  var boundArgs = fn.boundArgs_;

  if (arguments.length > 2) {
    var args = Array.prototype.slice.call(arguments, 2);
    if (boundArgs) {
      args.unshift.apply(args, boundArgs);
    }
    boundArgs = args;
  }

  selfObj = fn.boundSelf_ || selfObj;
  fn = fn.boundFn_ || fn;

  var newfn;
  var context = selfObj || goog.global;

  if (boundArgs) {
    newfn = function() {
      // Combine the static args and the new args into one big array
      var args = Array.prototype.slice.call(arguments);
      args.unshift.apply(args, boundArgs);
      return fn.apply(context, args);
    };
  } else {
    newfn = function() {
      return fn.apply(context, arguments);
    };
  }

  newfn.boundArgs_ = boundArgs;
  newfn.boundSelf_ = selfObj;
  newfn.boundFn_ = fn;

  return newfn;
};


/**
 * Like bind(), except that a 'this object' is not required. Useful when the
 * target function is already bound.
 *
 * Usage:
 * var g = partial(f, arg1, arg2);
 * g(arg3, arg4);
 *
 * @param {Function} fn A function to partially apply.
 * @param {Object} var_args Additional arguments that are partially
 *     applied to fn.
 * @return {!Function} A partially-applied form of the function bind() was
 *     invoked as a method of.
 */
goog.partial = function(fn, var_args) {
  var args = Array.prototype.slice.call(arguments, 1);
  args.unshift(fn, null);
  return goog.bind.apply(null, args);
};


/**
 * Copies all the members of a source object to a target object.
 * @param {Object} target Target.
 * @param {Object} source Source.
 * @deprecated Use goog.object.extend instead.
 */
goog.mixin = function(target, source) {
  for (var x in source) {
    target[x] = source[x];
  }

  // For IE the for-in-loop does not contain any properties that are not
  // enumerable on the prototype object (for example, isPrototypeOf from
  // Object.prototype) but also it will not include 'replace' on objects that
  // extend String and change 'replace' (not that it is common for anyone to
  // extend anything except Object).
};


/**
 * A simple wrapper for new Date().getTime().
 *
 * @return {number} An integer value representing the number of milliseconds
 *     between midnight, January 1, 1970 and the current time.
 */
goog.now = Date.now || (function() {
  return new Date().getTime();
});


/**
 * Evals javascript in the global scope.  In IE this uses execScript, other
 * browsers use goog.global.eval. If goog.global.eval does not evaluate in the
 * global scope (for example, in Safari), appends a script tag instead.
 * Throws an exception if neither execScript or eval is defined.
 * @param {string} script JavaScript string.
 */
goog.globalEval = function(script) {
  if (goog.global.execScript) {
    goog.global.execScript(script, 'JavaScript');
  } else if (goog.global.eval) {
    // Test to see if eval works
    if (goog.evalWorksForGlobals_ == null) {
      goog.global.eval('var _et_ = 1;');
      if (typeof goog.global['_et_'] != 'undefined') {
        delete goog.global['_et_'];
        goog.evalWorksForGlobals_ = true;
      } else {
        goog.evalWorksForGlobals_ = false;
      }
    }

    if (goog.evalWorksForGlobals_) {
      goog.global.eval(script);
    } else {
      var doc = goog.global.document;
      var scriptElt = doc.createElement('script');
      scriptElt.type = 'text/javascript';
      scriptElt.defer = false;
      // Note(pupius): can't use .innerHTML since "t('<test>')" will fail and
      // .text doesn't work in Safari 2.  Therefore we append a text node.
      scriptElt.appendChild(doc.createTextNode(script));
      doc.body.appendChild(scriptElt);
      doc.body.removeChild(scriptElt);
    }
  } else {
    throw Error('goog.globalEval not available');
  }
};


/**
 * Forward declaration of a type name.
 *
 * A call of the form
 * goog.declareType('goog.MyClass');
 * tells JSCompiler "goog.MyClass is not a hard dependency of this file.
 * But it may appear in the type annotations here. This is to assure
 * you that the class does indeed exist, even if it's not declared in the
 * final binary."
 *
 * In uncompiled code, does nothing.
 * @param {string} typeName The name of the type.
 */
goog.declareType = function(typeName) {};


/**
 * A macro for defining composite types.
 *
 * By assigning goog.typedef to a name, this tells JSCompiler that this is not
 * the name of a class, but rather it's the name of a composite type.
 *
 * For example,
 * /** @type {Array|NodeList} / goog.ArrayLike = goog.typedef;
 * will tell JSCompiler to replace all appearances of goog.ArrayLike in type
 * definitions with the union of Array and NodeList.
 *
 * Does nothing in uncompiled code.
 */
goog.typedef = true;


/**
 * Handles strings that are intended to be used as CSS class names.
 *
 * Without JS Compiler the arguments are simple joined with a hyphen and passed
 * through unaltered.
 *
 * With the JS Compiler the arguments are inlined, e.g:
 *     var x = goog.getCssName('foo');
 *     var y = goog.getCssName(this.baseClass, 'active');
 *  becomes:
 *     var x= 'foo';
 *     var y = this.baseClass + '-active';
 *
 * If a CSS renaming map is passed to the compiler it will replace symbols in
 * the classname.  If one argument is passed it will be processed, if two are
 * passed only the modifier will be processed, as it is assumed the first
 * argument was generated as a result of calling goog.getCssName.
 *
 * Names are split on 'hyphen' and processed in parts such that the following
 * are equivalent:
 *   var base = goog.getCssName('baseclass');
 *   goog.getCssName(base, 'modifier');
 *   goog.getCSsName('baseclass-modifier');
 *
 * If any part does not appear in the renaming map a warning is logged and the
 * original, unobfuscated class name is inlined.
 *
 * @param {string} className The class name.
 * @param {string} opt_modifier A modifier to be appended to the class name.
 * @return {string} The class name or the concatenation of the class name and
 *     the modifier.
 */
goog.getCssName = function(className, opt_modifier) {
  return className + (opt_modifier ? '-' + opt_modifier : '');
};


/**
 * Abstract implementation of goog.getMsg for use with localized messages.
 * @param {string} str Translatable string, places holders in the form {$foo}.
 * @param {Object} opt_values Map of place holder name to value.
 * @return {string} message with placeholders filled.
 */
goog.getMsg = function(str, opt_values) {
  var values = opt_values || {};
  for (var key in values) {
    str = str.replace(new RegExp('\\{\\$' + key + '\\}', 'gi'), values[key]);
  }
  return str;
};


/**
 * Exposes an unobfuscated global namespace path for the given object.
 * Note that fields of the exported object *will* be obfuscated,
 * unless they are exported in turn via this function or
 * goog.exportProperty
 *
 * <p>Also handy for making public items that are defined in anonymous
 * closures.
 *
 * ex. goog.exportSymbol('Foo', Foo);
 *
 * ex. goog.exportSymbol('public.path.Foo.staticFunction',
 *                       Foo.staticFunction);
 *     public.path.Foo.staticFunction();
 *
 * ex. goog.exportSymbol('public.path.Foo.prototype.myMethod',
 *                       Foo.prototype.myMethod);
 *     new public.path.Foo().myMethod();
 *
 * @param {string} publicPath Unobfuscated name to export.
 * @param {Object} object Object the name should point to.
 * @param {Object} opt_objectToExportTo The object to add the path to; default
 *     is |goog.global|.
 */
goog.exportSymbol = function(publicPath, object, opt_objectToExportTo) {
  goog.exportPath_(publicPath, object, opt_objectToExportTo);
};


/**
 * Exports a property unobfuscated into the object's namespace.
 * ex. goog.exportProperty(Foo, 'staticFunction', Foo.staticFunction);
 * ex. goog.exportProperty(Foo.prototype, 'myMethod', Foo.prototype.myMethod);
 * @param {Object} object Object whose static property is being exported.
 * @param {string} publicName Unobfuscated name to export.
 * @param {Object} symbol Object the name should point to.
 */
goog.exportProperty = function(object, publicName, symbol) {
  object[publicName] = symbol;
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * Usage:
 * <pre>
 * function ParentClass(a, b) { }
 * ParentClass.prototype.foo = function(a) { }
 *
 * function ChildClass(a, b, c) {
 *   ParentClass.call(this, a, b);
 * }
 *
 * goog.inherits(ChildClass, ParentClass);
 *
 * var child = new ChildClass('a', 'b', 'see');
 * child.foo(); // works
 * </pre>
 *
 * In addition, a superclass' implementation of a method can be invoked
 * as follows:
 *
 * <pre>
 * ChildClass.prototype.foo = function(a) {
 *   ChildClass.superClass_.foo.call(this, a);
 *   // other code
 * };
 * </pre>
 *
 * @param {Function} childCtor Child class.
 * @param {Function} parentCtor Parent class.
 */
goog.inherits = function(childCtor, parentCtor) {
  /** @constructor */
  function tempCtor() {};
  tempCtor.prototype = parentCtor.prototype;
  childCtor.superClass_ = parentCtor.prototype;
  childCtor.prototype = new tempCtor();
  childCtor.prototype.constructor = childCtor;
};

// Copyright 2006 Google Inc.
// All Rights Reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 
//  * Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
//  * Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in
//    the documentation and/or other materials provided with the
//    distribution.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
// INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
// BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
// LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
// ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE. 

/**
 * @fileoverview Utilities for manipulating arrays.
 *
 */


goog.provide('goog.array');


/**
 * @type {Array|NodeList|Arguments|{length: number}}
 */
goog.array.ArrayLike = goog.typedef;


/**
 * Returns the last element in an array without removing it.
 * @param {goog.array.ArrayLike} array The array.
 * @return {*} Last item in array.
 */
goog.array.peek = function(array) {
  return array[array.length - 1];
};


/**
 * Returns the index of the first element of an array with a specified
 * value, or -1 if the element is not present in the array.
 *
 * See {@link http://tinyurl.com/nga8b}
 *
 * @param {goog.array.ArrayLike} arr The array to be searched.
 * @param {*} obj The object for which we are searching.
 * @param {number} opt_fromIndex The index at which to start the search. If
 *     omitted the search starts at index 0.
 * @return {number} The index of the first matching array element.
 */
goog.array.indexOf = function(arr, obj, opt_fromIndex) {
  if (arr.indexOf) {
    return arr.indexOf(obj, opt_fromIndex);
  }
  if (Array.indexOf) {
    return Array.indexOf(arr, obj, opt_fromIndex);
  }

  var fromIndex = opt_fromIndex == null ?
      0 : (opt_fromIndex < 0 ?
           Math.max(0, arr.length + opt_fromIndex) : opt_fromIndex);
  for (var i = fromIndex; i < arr.length; i++) {
    if (i in arr && arr[i] === obj)
      return i;
  }
  return -1;
};


/**
 * Returns the index of the last element of an array with a specified value, or
 * -1 if the element is not present in the array.
 *
 * See {@link http://tinyurl.com/ru6lg}
 *
 * @param {goog.array.ArrayLike} arr The array to be searched.
 * @param {*} obj The object for which we are searching.
 * @param {number?} opt_fromIndex The index at which to start the search. If
 *     omitted the search starts at the end of the array.
 * @return {number} The index of the last matching array element.
 */
goog.array.lastIndexOf = function(arr, obj, opt_fromIndex) {
  // if undefined or null are passed then that is treated as 0 which will
  // always return -1;
  var fromIndex = opt_fromIndex == null ? arr.length - 1 : opt_fromIndex;

  if (arr.lastIndexOf) {
    return arr.lastIndexOf(obj, fromIndex);
  }
  if (Array.lastIndexOf) {
    return Array.lastIndexOf(arr, obj, fromIndex);
  }

  if (fromIndex < 0) {
    fromIndex = Math.max(0, arr.length + fromIndex);
  }
  for (var i = fromIndex; i >= 0; i--) {
    if (i in arr && arr[i] === obj)
      return i;
  }
  return -1;
};


/**
 * Calls a function for each element in an array.
 *
 * See {@link http://tinyurl.com/jrvcb}
 *
 * @param {goog.array.ArrayLike} arr Array or array like object over
 *     which to iterate.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array). The return
 *     value is ignored. The function is called only for indexes of the array
 *     which have assigned values; it is not called for indexes which have
 *     been deleted or which have never been assigned values. See {@link
 *     https://developer.mozilla.org/En/Core_JavaScript_1.5_Reference:Objects:
 *     Array:forEach}.
 *
 * @param {Object} opt_obj The object to be used as the value of 'this'
 *     within f.
 */
goog.array.forEach = function(arr, f, opt_obj) {
  if (arr.forEach) {
    arr.forEach(f, opt_obj);
  } else if (Array.forEach) {
    Array.forEach(/** @type {Array} */ (arr), f, opt_obj);
  } else {
    var l = arr.length;  // must be fixed during loop... see docs
    var arr2 = goog.isString(arr) ? arr.split('') : arr;
    for (var i = 0; i < l; i++) {
      if (i in arr2) {
        f.call(opt_obj, arr2[i], i, arr);
      }
    }
  }
};


/**
 * Calls a function for each element in an array, starting from the last
 * element rather than the first.
 *
 * @param {goog.Array.ArrayLike} arr The array over which to iterate.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array). The return
 *     value is ignored.
 * @param {Object} opt_obj The object to be used as the value of 'this'
 *     within f.
 */
goog.array.forEachRight = function(arr, f, opt_obj) {
  var l = arr.length;  // must be fixed during loop... see docs
  var arr2 = goog.isString(arr) ? arr.split('') : arr;
  for (var i = l - 1; i >= 0; --i) {
    if (i in arr2) {
      f.call(opt_obj, arr2[i], i, arr);
    }
  }
};


/**
 * Calls a function for each element in an array, and if the function returns
 * true adds the element to a new array.
 *
 * See {@link http://tinyurl.com/rmtuo}
 *
 * @param {Array} arr The array over which to iterate.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array) and must
 *     return a Boolean. If the return value is true the element is added to the
 *     result array. If it is false the element is not included.
 * @param {Object} opt_obj The object to be used as the value of 'this'
 *     within f.
 * @return {Array} a new array in which only elements that passed the test are
 *     present.
 */
goog.array.filter = function(arr, f, opt_obj) {
  if (arr.filter) {
    return arr.filter(f, opt_obj);
  }
  if (Array.filter) {
    return Array.filter(arr, f, opt_obj);
  }

  var l = arr.length;  // must be fixed during loop... see docs
  var res = [];
  var resLength = 0;
  var arr2 = goog.isString(arr) ? arr.split('') : arr;
  for (var i = 0; i < l; i++) {
    if (i in arr2) {
      var val = arr2[i];  // in case f mutates arr2
      if (f.call(opt_obj, val, i, arr)) {
        res[resLength++] = val;
      }
    }
  }
  return res;
};


/**
 * Calls a function for each element in an array and inserts the result into a
 * new array.
 *
 * See {@link http://tinyurl.com/hlx5p}
 *
 * @param {Array} arr The array over which to iterate.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array) and should
 *     return something. The result will be inserted into a new array.
 * @param {Object} opt_obj The object to be used as the value of 'this'
 *     within f.
 * @return {Array} a new array with the results from f.
 */
goog.array.map = function(arr, f, opt_obj) {
  if (arr.map) {
    return arr.map(f, opt_obj);
  }
  if (Array.map) {
    return Array.map(arr, f, opt_obj);
  }

  var l = arr.length;  // must be fixed during loop... see docs
  var res = [];
  var resLength = 0;
  var arr2 = goog.isString(arr) ? arr.split('') : arr;
  for (var i = 0; i < l; i++) {
    if (i in arr2) {
      res[resLength++] = f.call(opt_obj, arr2[i], i, arr);
    }
  }
  return res;
};


/**
 * Passes every element of an array into a function and accumulates the result.
 * We're google; we can't have "map" without "reduce" can we?
 *
 * Passes through to:
 *     http://developer.mozilla.org/en/docs/Core_JavaScript_1.5_Reference:
 *     Objects:Array:reduce
 * when available.
 *
 * For example:
 * var a = [1, 2, 3, 4];
 * goog.array.reduce(a, function(r, v, i, arr) {return r + v;}, 0);
 * returns 10
 *
 * @param {goog.array.ArrayLike} arr The array over which to iterate.
 * @param {Function} f The function to call for every element. This function
 *     takes 4 arguments (the function's previous result or the initial value,
 *     the value of the current array element, the current array index, and the
 *     array itself)
 *     function(previousValue, currentValue, index, array).
 * @param {*} val The initial value to pass into the function on the first call.
 * @param {Object} opt_obj  The object to be used as the value of 'this'
 *     within f.
 * @return {*} Result of evaluating f repeatedly across the values of the array.
 * @notypecheck See http://b/1342779
 */
goog.array.reduce = function(arr, f, val, opt_obj) {
  if (arr.reduce) {
    if (opt_obj) {
      return arr.reduce(goog.bind(f, opt_obj), val);
    } else {
      return arr.reduce(f, val);
    }
  }
  var rval = val;
  goog.array.forEach(arr, function(val, index) {
    rval = f.call(opt_obj, rval, val, index, arr);
  });
  return rval;
};


/**
 * Passes every element of an array into a function and accumulates the result,
 * starting from the last element and working towards the first.
 *
 * Passes through to:
 *     http://developer.mozilla.org/en/docs/Core_JavaScript_1.5_Reference:
 *     Objects:Array:reduceRight
 * when available.
 *
 * For example:
 * var a = ['a', 'b', 'c'];
 * goog.array.reduceRight(a, function(r, v, i, arr) {return r + v;}, '');
 * returns 'cba'
 *
 * @param {goog.array.ArrayLike} arr The array over which to iterate.
 * @param {Function} f The function to call for every element. This function
 *     takes 4 arguments (the function's previous result or the initial value,
 *     the value of the current array element, the current array index, and the
 *     array itself)
 *     function(previousValue, currentValue, index, array).
 * @param {*} val The initial value to pass into the function on the first call.
 * @param {Object} opt_obj The object to be used as the value of 'this'
 *     within f.
 * @return {*} Object returned as a result of evaluating f repeatedly across the
 *     values of the array.
 * @notypecheck See http://b/1342779
 */
goog.array.reduceRight = function(arr, f, val, opt_obj) {
  if (arr.reduceRight) {
    if (opt_obj) {
      return arr.reduceRight(goog.bind(f, opt_obj), val);
    } else {
      return arr.reduceRight(f, val);
    }
  }
  var rval = val;
  goog.array.forEachRight(arr, function(val, index) {
    rval = f.call(opt_obj, rval, val, index, arr);
  });
  return rval;
};


/**
 * Calls f for each element of an array. If any call returns true, some()
 * returns true (without checking the remaining elements). If all calls
 * return false, some() returns false.
 *
 * See {@link http://tinyurl.com/ekkc2}
 *
 * @param {Array} arr The array to check.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array) and must
 *     return a Boolean.
 * @param {Object} opt_obj  The object to be used as the value of 'this'
 *     within f.
 * @return {boolean} true if any element passes the test.
 */
goog.array.some = function(arr, f, opt_obj) {
  if (arr.some) {
    return arr.some(f, opt_obj);
  }
  if (Array.some) {
    return Array.some(arr, f, opt_obj);
  }

  var l = arr.length;  // must be fixed during loop... see docs
  var arr2 = goog.isString(arr) ? arr.split('') : arr;
  for (var i = 0; i < l; i++) {
    if (i in arr2 && f.call(opt_obj, arr2[i], i, arr)) {
      return true;
    }
  }
  return false;
};


/**
 * Call f for each element of an array. If all calls return true, every()
 * returns true. If any call returns false, every() returns false and
 * does not continue to check the remaining elements.
 *
 * See {@link http://tinyurl.com/rx3mg}
 *
 * @param {Array} arr The array to check.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array) and must
 *     return a Boolean.
 * @param {Object} opt_obj The object to be used as the value of 'this'
 *     within f.
 * @return {boolean} false if any element fails the test.
 */
goog.array.every = function(arr, f, opt_obj) {
  if (arr.every) {
    return arr.every(f, opt_obj);
  }
  if (Array.every) {
    return Array.every(arr, f, opt_obj);
  }

  var l = arr.length;  // must be fixed during loop... see docs
  var arr2 = goog.isString(arr) ? arr.split('') : arr;
  for (var i = 0; i < l; i++) {
    if (i in arr2 && !f.call(opt_obj, arr2[i], i, arr)) {
      return false;
    }
  }
  return true;
};


/**
 * Search an array for the first element that satisfies a given condition and
 * return that element.
 * @param {goog.array.ArrayLike} arr The array to search.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array) and should
 *     return a boolean.
 * @param {Object} opt_obj An optional "this" context for the function.
 * @return {*} The first array element that passes the test, or null if no
 *     element is found.
 */
goog.array.find = function(arr, f, opt_obj) {
  var i = goog.array.findIndex(arr, f, opt_obj);
  return i < 0 ? null : goog.isString(arr) ? arr.charAt(i) : arr[i];
};


/**
 * Search an array for the first element that satisfies a given condition and
 * return its index.
 * @param {goog.array.ArrayLike} arr The array to search.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array) and should
 *     return a boolean.
 * @param {Object} opt_obj An optional "this" context for the function.
 * @return {number} The index of the first array element that passes the test,
 *     or -1 if no element is found.
 */
goog.array.findIndex = function(arr, f, opt_obj) {
  var l = arr.length;  // must be fixed during loop... see docs
  var arr2 = goog.isString(arr) ? arr.split('') : arr;
  for (var i = 0; i < l; i++) {
    if (i in arr2 && f.call(opt_obj, arr2[i], i, arr)) {
      return i;
    }
  }
  return -1;
};


/**
 * Search an array (in reverse order) for the last element that satisfies a
 * given condition and return that element.
 * @param {goog.array.ArrayLike} arr The array to search.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array) and should
 *     return a boolean.
 * @param {Object} opt_obj An optional "this" context for the function.
 * @return {*} The last array element that passes the test, or null if no
 *     element is found.
 */
goog.array.findRight = function(arr, f, opt_obj) {
  var i = goog.array.findIndexRight(arr, f, opt_obj);
  return i < 0 ? null : goog.isString(arr) ? arr.charAt(i) : arr[i];
};


/**
 * Search an array (in reverse order) for the last element that satisfies a
 * given condition and return its index.
 * @param {goog.array.ArrayLike} arr The array to search.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array) and should
 *     return a boolean.
 * @param {Object} opt_obj An optional "this" context for the function.
 * @return {number} The index of the last array element that passes the test,
 *     or -1 if no element is found.
 */
goog.array.findIndexRight = function(arr, f, opt_obj) {
  var l = arr.length;  // must be fixed during loop... see docs
  var arr2 = goog.isString(arr) ? arr.split('') : arr;
  for (var i = l - 1; i >= 0; i--) {
    if (i in arr2 && f.call(opt_obj, arr2[i], i, arr)) {
      return i;
    }
  }
  return -1;
};


/**
 * Whether the array contains the given object.
 * @param {goog.array.ArrayLike} arr The array to test for the presence of the
 *     element.
 * @param {*} obj The object for which to test.
 * @return {boolean} true if obj is present.
 */
goog.array.contains = function(arr, obj) {
  if (arr.contains) {
    return arr.contains(obj);
  }

  return goog.array.indexOf(arr, obj) > -1;
};


/**
 * Whether the array is empty.
 * @param {goog.array.ArrayLike} arr The array to test.
 * @return {boolean} true if empty.
 */
goog.array.isEmpty = function(arr) {
  return arr.length == 0;
};


/**
 * Clears the array.
 * @param {goog.array.ArrayLike} arr Array or array like object to clear.
 */
goog.array.clear = function(arr) {
  // for non real arrays we don't have the magic length so we delete the
  // indices
  if (!goog.isArray(arr)) {
    for (var i = arr.length - 1; i >= 0; i--) {
      delete arr[i];
    }
  }
  arr.length = 0;
};


/**
 * Pushes an item into an array, if it's not already in the array.
 * @param {Array} arr Array into which to insert the item.
 * @param {*} obj Value to add.
 */
goog.array.insert = function(arr, obj) {
  if (!goog.array.contains(arr, obj)) {
    arr.push(obj);
  }
};


/**
 * Inserts an object at the given index of the array.
 * @param {goog.array.ArrayLike} arr The array to modify.
 * @param {*} obj The object to insert.
 * @param {number} opt_i The index at which to insert the object. If omitted,
 *      treated as 0. A negative index is counted from the end of the array.
 */
goog.array.insertAt = function(arr, obj, opt_i) {
  goog.array.splice(arr, opt_i, 0, obj);
};


/**
 * Inserts at the given index of the array, all elements of another array.
 * @param {goog.array.ArrayLike} arr The array to modify.
 * @param {goog.array.ArrayLike} elementsToAdd The array of elements to add.
 * @param {number} opt_i The index at which to insert the object. If omitted,
 *      treated as 0. A negative index is counted from the end of the array.
 */
goog.array.insertArrayAt = function(arr, elementsToAdd, opt_i) {
  goog.partial(goog.array.splice, arr, opt_i, 0).apply(null, elementsToAdd);
};


/**
 * Inserts an object into an array before a specified object.
 * @param {Array} arr The array to modify.
 * @param {*} obj The object to insert.
 * @param {*} opt_obj2 The object before which obj should be inserted. If obj2
 *     is omitted or not found, obj is inserted at the end of the array.
 */
goog.array.insertBefore = function(arr, obj, opt_obj2) {
  var i;
  if (arguments.length == 2 || (i = goog.array.indexOf(arr, opt_obj2)) == -1) {
    arr.push(obj);
  } else {
    goog.array.insertAt(arr, obj, i);
  }
};


/**
 * Removes the first occurrence of a particular value from an array.
 * @param {goog.array.ArrayLike} arr Array from which to remove value.
 * @param {*} obj Object to remove.
 * @return {boolean} True if an element was removed.
 */
goog.array.remove = function(arr, obj) {
  var i = goog.array.indexOf(arr, obj);
  var rv;
  if ((rv = i != -1)) {
    goog.array.removeAt(arr, i);
  }
  return rv;
};


/**
 * Removes from an array the element at index i
 * @param {goog.array.ArrayLike} arr Array or array like object from which to
 *     remove value.
 * @param {number} i The index to remove.
 * @return {boolean} True if an element was removed.
 */
goog.array.removeAt = function(arr, i) {
  // use generic form of splice
  // splice returns the removed items and if successful the length of that
  // will be 1
  return Array.prototype.splice.call(arr, i, 1).length == 1;
};


/**
 * Removes the first value that satisfies the given condition.
 * @param {goog.array.ArrayLike} arr Array from which to remove value.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the array) and should
 *     return a boolean.
 * @param {Object} opt_obj An optional "this" context for the function.
 * @return {boolean} True if an element was removed.
 */
goog.array.removeIf = function(arr, f, opt_obj) {
  var i = goog.array.findIndex(arr, f, opt_obj);
  if (i >= 0) {
    goog.array.removeAt(arr, i);
    return true;
  }
  return false;
};


/**
 * Does a shallow copy of an array.
 * @param {goog.array.ArrayLike} arr  Array or array-like object to clone.
 * @return {Array} Clone of the input array.
 */
goog.array.clone = function(arr) {
  if (goog.isArray(arr)) {
    // Generic concat does not seem to work so lets just use the plain old
    // instance method.
    return arr.concat();
  } else { // array like
    // Concat does not work with non arrays
    var rv = [];
    for (var i = 0, len = arr.length; i < len; i++) {
      rv[i] = arr[i];
    }
    return rv;
  }
};


/**
 * Converts an object to an array.
 * @param {goog.array.ArrayLike} object  The object to convert to an array.
 * @return {Array} The object converted into an array. If object has a
 *     length property, every property indexed with a non-negative number
 *     less than length will be included in the result. If object does not
 *     have a length property, an empty array will be returned.
 */
goog.array.toArray = function(object) {
  if (goog.isArray(object)) {
    // This fixes the JS compiler warning and forces the Object to an Array type
    return object.concat();
  }
  // Clone what we hope to be an array-like object to an array.
  // We could check isArrayLike() first, but no check we perform would be as
  // reliable as simply making the call.
  return goog.array.clone(/** @type {Array} */ (object));
};


/**
 * Extends an array with another array, element, or "array like" object.
 * This function operates 'in-place', it does not create a new Array.
 *
 * Example:
 * var a = [];
 * goog.array.extend(a, [0, 1]);
 * a; // [0, 1]
 * goog.array.extend(a, 2);
 * a; // [0, 1, 2]
 *
 * @param {Array} arr1  The array to modify.
 * @param {*} var_args The elements or arrays of elements to add to arr1.
 */
goog.array.extend = function(arr1, var_args) {
  for (var i = 1; i < arguments.length; i++) {
    var arr2 = arguments[i];
    if (goog.isArrayLike(arr2)) {
      // Make sure arr2 is a real array, and not just "array like."
      arr2 = goog.array.toArray(arr2);
      arr1.push.apply(arr1, arr2);
    } else {
      arr1.push(arr2);
    }
  }
};


/**
 * Adds or removes elements from an array. This is a generic version of Array
 * splice. This means that it might work on other objects similar to arrays,
 * such as the arguments object.
 *
 * @param {goog.array.ArrayLike} arr The array to modify.
 * @param {number|undefined} index The index at which to start changing the
 *     array. If not defined, treated as 0.
 * @param {number} howMany How many elements to remove (0 means no removal. A
 *     value below 0 is treated as zero and so is any other non number. Numbers
 *     are floored).
 * @param {*} var_args Optional, additional elements to insert into the
 *     array.
 * @return {Array} the removed elements.
 */
goog.array.splice = function(arr, index, howMany, var_args) {
  return Array.prototype.splice.apply(arr, goog.array.slice(arguments, 1));
};


/**
 * Returns a new array from a segment of an array. This is a generic version of
 * Array slice. This means that it might work on other objects similar to
 * arrays, such as the arguments object.
 *
 * @param {goog.array.ArrayLike} arr The array from which to copy a segment.
 * @param {number} start The index of the first element to copy.
 * @param {number} opt_end The index after the last element to copy.
 * @return {Array} A new array containing the specified segment of the original
 *     array.
 */
goog.array.slice = function(arr, start, opt_end) {
  // passing 1 arg to slice is not the same as passing 2 where the second is
  // null or undefined (in that case the second argument is treated as 0).
  // we could use slice on the arguments object and then use apply instead of
  // testing the length
  if (arguments.length <= 2) {
    return Array.prototype.slice.call(arr, start);
  } else {
    return Array.prototype.slice.call(arr, start, opt_end);
  }
};


/**
 * Removes all duplicates from an array (retaining only the first
 * occurrence of each array element).  This function modifies the
 * array in place and doesn't change the order of the non-duplicate items.
 *
 * For objects, duplicates are identified as having the same hash code property
 * as defined by {@see goog.getHashCode}.
 *
 * Runtime: N,
 * Worstcase space: 2N (no dupes)
 *
 * @param {goog.array.ArrayLike} arr The array from which to remove duplicates.
 * @param {Array} opt_rv An optional array in which to return the results,
 *     instead of performing the removal inplace.  If specified, the original
 *     array will remain unchanged.
 */
goog.array.removeDuplicates = function(arr, opt_rv) {
  var rv = opt_rv || arr;
  var seen = {}, cursorInsert = 0, cursorRead = 0;
  while (cursorRead < arr.length) {
    var current = arr[cursorRead++];
    var hc = goog.isObject(current) ? goog.getHashCode(current) : current;
    if (!(hc in seen)) {
      seen[hc] = true;
      rv[cursorInsert++] = current;
    }
  }
  rv.length = cursorInsert;
};


/**
 * Searches the specified array for the specified target using the binary
 * search algorithm.  If no opt_compareFn is specified, elements are compared
 * using <code>goog.array.defaultCompare</code>, which compares the elements
 * using the built in < and > operators.  This will produce the expected
 * behavior for homogeneous arrays of String(s) and Number(s). The array
 * specified <b>must</b> be sorted in ascending order (as defined by the
 * comparison function).  If the array is not sorted, results are undefined.
 * If the array contains multiple instances of the specified target value, any
 * of these instances may be found.
 *
 * Runtime: O(log n)
 *
 * @param {goog.array.ArrayLike} arr The array to be searched.
 * @param {*} target The sought value.
 * @param {Function} opt_compareFn Optional comparison function by which the
 *     array is ordered. Should take 2 arguments to compare, and return a
 *     negative integer, zero, or a positive integer depending on whether the
 *     first argument is less than, equal to, or greater than the second.
 * @return {number} Index of the target value if found, otherwise
 *     (-(insertion point) - 1). The insertion point is where the value should
 *     be inserted into arr to preserve the sorted property.  Return value >= 0
 *     iff target is found.
 */
goog.array.binarySearch = function(arr, target, opt_compareFn) {
  var left = 0;
  var right = arr.length - 1;
  var compareFn = opt_compareFn || goog.array.defaultCompare;
  while (left <= right) {
    var mid = (left + right) >> 1;
    var compareResult = compareFn(target, arr[mid]);
    if (compareResult > 0) {
      left = mid + 1;
    } else if (compareResult < 0) {
      right = mid - 1;
    } else {
      return mid;
    }
  }
  // Not found, left is the insertion point.
  return -(left + 1);
};


/**
 * Sorts the specified array into ascending order.  If no opt_compareFn is
 * specified, elements are compared using
 * <code>goog.array.defaultCompare</code>, which compares the elements using
 * the built in < and > operators.  This will produce the expected behavior
 * for homogeneous arrays of String(s) and Number(s).
 *
 * This sort is not guaranteed to be stable.
 *
 * Runtime: Same as <code>Array.prototype.sort</code>
 *
 * @param {Array} arr The array to be sorted.
 * @param {Function} opt_compareFn Optional comparison function by which the
 *     array is to be ordered. Should take 2 arguments to compare, and return a
 *     negative integer, zero, or a positive integer depending on whether the
 *     first argument is less than, equal to, or greater than the second.
 */
goog.array.sort = function(arr, opt_compareFn) {
  Array.prototype.sort.call(arr, opt_compareFn || goog.array.defaultCompare);
};


/**
 * Sorts the specified array into ascending order in a stable way.  If no
 * opt_compareFn is specified, elements are compared using
 * <code>goog.array.defaultCompare</code>, which compares the elements using
 * the built in < and > operators.  This will produce the expected behavior
 * for homogeneous arrays of String(s) and Number(s).
 *
 * Runtime: Same as <code>Array.prototype.sort</code>, plus an additional
 * O(n) overhead of copying the array twice.
 *
 * @param {Array} arr The array to be sorted.
 * @param {function(*, *): number} opt_compareFn Optional comparison function by
 *     which the array is to be ordered. Should take 2 arguments to compare, and
 *     return a negative integer, zero, or a positive integer depending on
 *     whether the first argument is less than, equal to, or greater than the
 *     second.
 */
goog.array.stableSort = function(arr, opt_compareFn) {
  for (var i = 0; i < arr.length; i++) {
    arr[i] = {index: i, value: arr[i]};
  }
  var valueCompareFn = opt_compareFn || goog.array.defaultCompare;
  function stableCompareFn(obj1, obj2) {
    return valueCompareFn(obj1.value, obj2.value) || obj1.index - obj2.index;
  };
  goog.array.sort(arr, stableCompareFn);
  for (var i = 0; i < arr.length; i++) {
    arr[i] = arr[i].value;
  }
};


/**
 * Sorts an array of objects by the specified object key and compare
 * function. If no compare function is provided, the key values are
 * compared in ascending order using <code>goog.array.defaultCompare</code>.
 * This won't work for keys that get renamed by the compiler. So use
 * {'foo': 1, 'bar': 2} rather than {foo: 1, bar: 2}.
 * @param {Array.<Object>} arr An array of objects to sort.
 * @param {string} key The object key to sort by.
 * @param {Function} opt_compareFn The function to use to compare key
 *     values.
 */
goog.array.sortObjectsByKey = function(arr, key, opt_compareFn) {
  var compare = opt_compareFn || goog.array.defaultCompare;
  goog.array.sort(arr, function(a, b) {
    return compare(a[key], b[key]);
  });
};


/**
 * Compares two arrays for equality.  If no opt_compareFn is specified, uses
 * <code>goog.array.defaultCompareEquality</code>, which compares the elements
 * using the built-in '===' operator. Two arrays are considered equal if they
 * have the same length and their corresponding elements are equal according to
 * the comparison function.
 *
 * @param {Array} arr1 The first array to compare.
 * @param {Array} arr2 The second array to compare.
 * @param {Function} opt_compareFn  Optional comparison function.
 *     Should take 2 arguments to compare, and return true if the arguments
 *     are equal.
 * @return {boolean} True if the two arrays are equal.
 */
goog.array.compare = function(arr1, arr2, opt_compareFn) {
  if (!goog.isArrayLike(arr1) || !goog.isArrayLike(arr2) ||
      arr1.length != arr2.length) {
    return false;
  }
  var l = arr1.length;
  var compareFn = opt_compareFn || goog.array.defaultCompareEquality;
  for (var i = 0; i < l; i++) {
    if (!compareFn.call(null, arr1[i], arr2[i])) {
      return false;
    }
  }
  return true;
};


/**
 * Compares its two arguments for order, using the built in < and >
 * operators.
 * @param {*} a The first object to be compared.
 * @param {*} b The second object to be compared.
 * @return {number} a negative integer, zero, or a positive integer
 *     as the first argument is less than, equal to, or greater than the
 *     second.
 */
goog.array.defaultCompare = function(a, b) {
  return a > b ? 1 : a < b ? -1 : 0;
};


/**
 * Compares its two arguments for equality, using the built in === operator.
 * @param {*} a The first object to compare.
 * @param {*} b The second object to compare.
 * @return {boolean} True if the two arguments are equal, false otherwise.
 */
goog.array.defaultCompareEquality = function(a, b) {
  return a === b;
};


/**
 * Inserts a value into a sorted array. The array is not modified if the
 * value is already present.
 * @param {Array} array The array to modify.
 * @param {*} value The object to insert.
 * @param {Function} opt_compareFn Optional comparison function by which the
 *     array is ordered. Should take 2 arguments to compare, and
 *     return a negative integer, zero, or a positive integer depending on
 *     whether the first argument is less than, equal to, or greater than the
 *     second.
 * @return {boolean} True if an element was inserted.
 */
goog.array.binaryInsert = function(array, value, opt_compareFn) {
  var index = goog.array.binarySearch(array, value, opt_compareFn);
  if (index < 0) {
    goog.array.insertAt(array, value, -(index + 1));
    return true;
  }
  return false;
};


/**
 * Removes a value from a sorted array.
 * @param {Array} array The array to modify.
 * @param {*} value The object to remove.
 * @param {Function} opt_compareFn Optional comparison function by which the
 *     array is ordered. Should take 2 arguments to compare, and
 *     return a negative integer, zero, or a positive integer depending on
 *     whether the first argument is less than, equal to, or greater than the
 *     second.
 * @return {boolean} True if an element was removed.
 */
goog.array.binaryRemove = function(array, value, opt_compareFn) {
  var index = goog.array.binarySearch(array, value, opt_compareFn);
  return (index >= 0) ? goog.array.removeAt(array, index) : false;
};


/**
 * Splits an array into disjoint buckets according to a splitting function.
 * @param {Array} array The array.
 * @param {Function} sorter Function to call for every element.  This
 *     takes 3 arguments (the element, the index and the array) and must
 *     return a valid object key (a string, number, etc), or undefined, if
 *     that object should not be placed in a bucket.
 * @return {Object} An object, with keys being all of the unique return values
 *     of sorter, and values being arrays containing the items for
 *     which the splitter returned that key.
 */
goog.array.bucket = function(array, sorter) {
  var buckets = {};

  for (var i = 0; i < array.length; i++) {
    var value = array[i];
    var key = sorter(value, i, array);
    if (goog.isDef(key)) {
      // Push the value to the right bucket, creating it if necessary.
      var bucket = buckets[key] || (buckets[key] = []);
      bucket.push(value);
    }
  }

  return buckets;
};


/**
 * Returns an array consisting of the given value repeated N times.
 *
 * @param {*} value The value to repeat.
 * @param {number} n The repeat count.
 * @return {Array.<*>} An array with the repeated value.
 */
goog.array.repeat = function(value, n) {
  var array = [];
  for (var i = 0; i < n; i++) {
    array[i] = value;
  }
  return array;
};


/**
 * Returns an array consisting of every argument with all arrays
 * expanded in-place recursively.
 *
 * @param {*} var_args The values to flatten.
 * @return {Array.<*>} An array containing the flattened values.
 */
goog.array.flatten = function(var_args) {
  var result = [];
  for (var i = 0; i < arguments.length; i++) {
    var element = arguments[i];
    if (goog.isArray(element)) {
      result.push.apply(result, goog.array.flatten.apply(null, element));
    } else {
      result.push(element);
    }
  }
  return result;
};

// Copyright 2007 Google Inc.
// All Rights Reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 
//  * Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
//  * Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in
//    the documentation and/or other materials provided with the
//    distribution.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
// INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
// BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
// LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
// ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE. 

/**
 * @fileoverview Defines the goog.dom.TagName enum.  This enumerates
 * all html tag names specified by the W3C HTML 4.01 Specification.
 * Reference http://www.w3.org/TR/html401/index/elements.html.
 * @author Greg Baker (baker@google.com)
 */
goog.provide('goog.dom.TagName');

/**
 * Enum of all html tag names specified by the W3C HTML 4.01 Specification.
 * Reference http://www.w3.org/TR/html401/index/elements.html
 * @enum {string}
 */
goog.dom.TagName = {
  A: 'A',
  ABBR: 'ABBR',
  ACRONYM: 'ACRONYM',
  ADDRESS: 'ADDRESS',
  APPLET: 'APPLET',
  AREA: 'AREA',
  B: 'B',
  BASE: 'BASE',
  BASEFONT: 'BASEFONT',
  BDO: 'BDO',
  BIG: 'BIG',
  BLOCKQUOTE: 'BLOCKQUOTE',
  BODY: 'BODY',
  BR: 'BR',
  BUTTON: 'BUTTON',
  CAPTION: 'CAPTION',
  CENTER: 'CENTER',
  CITE: 'CITE',
  CODE: 'CODE',
  COL: 'COL',
  COLGROUP: 'COLGROUP',
  DD: 'DD',
  DEL: 'DEL',
  DFN: 'DFN',
  DIR: 'DIR',
  DIV: 'DIV',
  DL: 'DL',
  DT: 'DT',
  EM: 'EM',
  FIELDSET: 'FIELDSET',
  FONT: 'FONT',
  FORM: 'FORM',
  FRAME: 'FRAME',
  FRAMESET: 'FRAMESET',
  H1: 'H1',
  H2: 'H2',
  H3: 'H3',
  H4: 'H4',
  H5: 'H5',
  H6: 'H6',
  HEAD: 'HEAD',
  HR: 'HR',
  HTML: 'HTML',
  I: 'I',
  IFRAME: 'IFRAME',
  IMG: 'IMG',
  INPUT: 'INPUT',
  INS: 'INS',
  ISINDEX: 'ISINDEX',
  KBD: 'KBD',
  LABEL: 'LABEL',
  LEGEND: 'LEGEND',
  LI: 'LI',
  LINK: 'LINK',
  MAP: 'MAP',
  MENU: 'MENU',
  META: 'META',
  NOFRAMES: 'NOFRAMES',
  NOSCRIPT: 'NOSCRIPT',
  OBJECT: 'OBJECT',
  OL: 'OL',
  OPTGROUP: 'OPTGROUP',
  OPTION: 'OPTION',
  P: 'P',
  PARAM: 'PARAM',
  PRE: 'PRE',
  Q: 'Q',
  S: 'S',
  SAMP: 'SAMP',
  SCRIPT: 'SCRIPT',
  SELECT: 'SELECT',
  SMALL: 'SMALL',
  SPAN: 'SPAN',
  STRIKE: 'STRIKE',
  STRONG: 'STRONG',
  STYLE: 'STYLE',
  SUB: 'SUB',
  SUP: 'SUP',
  TABLE: 'TABLE',
  TBODY: 'TBODY',
  TD: 'TD',
  TEXTAREA: 'TEXTAREA',
  TFOOT: 'TFOOT',
  TH: 'TH',
  THEAD: 'THEAD',
  TITLE: 'TITLE',
  TR: 'TR',
  TT: 'TT',
  U: 'U',
  UL: 'UL',
  VAR: 'VAR'
};

// Copyright 2007 Google Inc.
// All Rights Reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 
//  * Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
//  * Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in
//    the documentation and/or other materials provided with the
//    distribution.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
// INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
// BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
// LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
// ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE. 

/**
 * @fileoverview A utility class for representing two-dimensional sizes.
 */


goog.provide('goog.math.Size');



/**
 * Class for representing sizes consisting of a width and height. Undefined
 * width and height support is deprecated and results in compiler warning.
 * @param {number} width Width.
 * @param {number} height Height.
 * @constructor
 */
goog.math.Size = function(width, height) {
  /**
   * Width
   * @type {number}
   */
  this.width = width;

  /**
   * Height
   * @type {number}
   */
  this.height = height;
};


/**
 * Compares sizes for equality.
 * @param {goog.math.Size} a A Size.
 * @param {goog.math.Size} b A Size.
 * @return {boolean} True iff the sizes have equal widths and equal
 *     heights, or if both are null.
 */
goog.math.Size.equals = function(a, b) {
  if (a == b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return a.width == b.width && a.height == b.height;
};


/**
 * @return {goog.math.Size} A new copy of the Size.
 */
goog.math.Size.prototype.clone = function() {
  return new goog.math.Size(this.width, this.height);
};


if (goog.DEBUG) {
  /**
   * Returns a nice string representing size.
   * @return {string} In the form (50 x 73).
   */
  goog.math.Size.prototype.toString = function() {
    return '(' + this.width + ' x ' + this.height + ')';
  };
}


/**
 * @return {number} The longer of the two dimensions in the size.
 */
goog.math.Size.prototype.getLongest = function() {
  return Math.max(this.width, this.height);
};


/**
 * @return {number} The shorter of the two dimensions in the size.
 */
goog.math.Size.prototype.getShortest = function() {
  return Math.min(this.width, this.height);
};


/**
 * @return {number} The area of the size (width * height).
 */
goog.math.Size.prototype.area = function() {
  return this.width * this.height;
};


/**
 * @return {number} The ratio of the size's width to its height.
 */
goog.math.Size.prototype.aspectRatio = function() {
  return this.width / this.height;
};


/**
 * @return {boolean} True if the size has zero area, false if both dimensions
 *     are non-zero numbers.
 */
goog.math.Size.prototype.isEmpty = function() {
  return !this.area();
};


/**
 * Clamps the width and height parameters upward to integer values.
 * @return {goog.math.Size} This size with ceil'd components.
 */
goog.math.Size.prototype.ceil = function() {
  this.width = Math.ceil(this.width);
  this.height = Math.ceil(this.height);
  return this;
};


/**
 * @param {goog.math.Size} target The target size.
 * @return {boolean} True if this Size is the same size or smaller than the
 *     target size in both dimensions.
 */
goog.math.Size.prototype.fitsInside = function(target) {
  return this.width <= target.width && this.height <= target.height;
};


/**
 * Clamps the width and height parameters downward to integer values.
 * @return {goog.math.Size} This size with floored components.
 */
goog.math.Size.prototype.floor = function() {
  this.width = Math.floor(this.width);
  this.height = Math.floor(this.height);
  return this;
};


/**
 * Rounds the width and height parameters to integer values.
 * @return {goog.math.Size} This size with rounded components.
 */
goog.math.Size.prototype.round = function() {
  this.width = Math.round(this.width);
  this.height = Math.round(this.height);
  return this;
};


/**
 * Scales the size uniformly by a factor.
 * @param {number} s The scale factor.
 * @return {goog.math.Size} This Size object after scaling.
 */
goog.math.Size.prototype.scale = function(s) {
  this.width *= s;
  this.height *= s;
  return this;
};


/**
 * Uniformly scales the size to fit inside the dimensions of a given size. The
 * original aspect ratio will be preserved.
 *
 * This function assumes that both Sizes contain strictly positive dimensions.
 * @param {goog.math.Size} target The target size.
 * @return {goog.math.Size} This Size object, after optional scaling.
 */
goog.math.Size.prototype.scaleToFit = function(target) {
  var s = this.aspectRatio() > target.aspectRatio() ?
      target.width / this.width :
      target.height / this.height;

  return this.scale(s);
};

// Copyright 2006 Google Inc.
// All Rights Reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 
//  * Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
//  * Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in
//    the documentation and/or other materials provided with the
//    distribution.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
// INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
// BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
// LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
// ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE. 

/**
 * @fileoverview A utility class for representing two-dimensional positions.
 */


goog.provide('goog.math.Coordinate');


/**
 * Class for representing coordinates and positions.
 * @param {number} opt_x Left, defaults to 0.
 * @param {number} opt_y Top, defaults to 0.
 * @constructor
 */
goog.math.Coordinate = function(opt_x, opt_y) {
  /**
   * X-value
   * @type {number}
   */
  this.x = goog.isDef(opt_x) ? opt_x : 0;

  /**
   * Y-value
   * @type {number}
   */
  this.y = goog.isDef(opt_y) ? opt_y : 0;
};


/**
 * Returns a new copy of the coordinate.
 * @return {goog.math.Coordinate} A clone of this coordinate.
 */
goog.math.Coordinate.prototype.clone = function() {
  return new goog.math.Coordinate(this.x, this.y);
};


if (goog.DEBUG) {
  /**
   * Returns a nice string representing the coordinate.
   * @return {string} In the form (50, 73).
   */
  goog.math.Coordinate.prototype.toString = function() {
    return '(' + this.x + ', ' + this.y + ')';
  };
}


/**
 * Compares coordinates for equality.
 * @param {goog.math.Coordinate} a A Coordinate.
 * @param {goog.math.Coordinate} b A Coordinate.
 * @return {boolean} True iff the coordinates are equal, or if both are null.
 */
goog.math.Coordinate.equals = function(a, b) {
  if (a == b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return a.x == b.x && a.y == b.y;
};


/**
 * Returns the distance between two coordinates.
 * @param {goog.math.Coordinate} a A Coordinate.
 * @param {goog.math.Coordinate} b A Coordinate.
 * @return {number} The distance between {@code a} and {@code b}.
 */
goog.math.Coordinate.distance = function(a, b) {
  var dx = a.x - b.x;
  var dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};


/**
 * Returns the squared distance between two coordinates. Squared distances can
 * be used for comparisons when the actual value is not required.
 *
 * Performance note: eliminating the square root is an optimization often used
 * in lower-level languages, but the speed difference is not nearly as
 * pronounced in JavaScript (only a few percent.)
 *
 * @param {goog.math.Coordinate} a A Coordinate.
 * @param {goog.math.Coordinate} b A Coordinate.
 * @return {number} The squared distance between {@code a} and {@code b}.
 */
goog.math.Coordinate.squaredDistance = function(a, b) {
  var dx = a.x - b.x;
  var dy = a.y - b.y;
  return dx * dx + dy * dy;
};


/**
 * Returns the difference between two coordinates as a new
 * goog.math.Coordinate.
 * @param {goog.math.Coordinate} a A Coordinate.
 * @param {goog.math.Coordinate} b A Coordinate.
 * @return {goog.math.Coordinate} A Coordinate representing the difference
 *     between {@code a} and {@code b}.
 */
goog.math.Coordinate.difference = function(a, b) {
  return new goog.math.Coordinate(a.x - b.x, a.y - b.y);
};


/**
 * Returns the sum of two coordinates as a new goog.math.Coordinate.
 * @param {goog.math.Coordinate} a A Coordinate.
 * @param {goog.math.Coordinate} b A Coordinate.
 * @return {goog.math.Coordinate} A Coordinate representing the sum of the two
 *     coordinates.
 */
goog.math.Coordinate.sum = function(a, b) {
  return new goog.math.Coordinate(a.x + b.x, a.y + b.y);
};

// Copyright 2006 Google Inc.
// All Rights Reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 
//  * Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
//  * Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in
//    the documentation and/or other materials provided with the
//    distribution.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
// INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
// BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
// LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
// ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE. 

/**
 * @fileoverview A utility class for representing a numeric box.
 */


goog.provide('goog.math.Box');

goog.require('goog.math.Coordinate');



/**
 * Class for representing a box. A box is specified as a top, right, bottom,
 * and left. A box is useful for representing margins and padding.
 *
 * @param {number} top Top.
 * @param {number} right Right.
 * @param {number} bottom Bottom.
 * @param {number} left Left.
 * @constructor
 */
goog.math.Box = function(top, right, bottom, left) {
  /**
   * Top
   * @type {number}
   */
  this.top = top;

  /**
   * Right
   * @type {number}
   */
  this.right = right;

  /**
   * Bottom
   * @type {number}
   */
  this.bottom = bottom;

  /**
   * Left
   * @type {number}
   */
  this.left = left;
};


/**
 * Creates a Box by bounding a collection of goog.math.Coordinate objects
 * @param {goog.math.Coordinate} var_args Coordinates to be included inside the
 *     box.
 * @return {goog.math.Box} A Box containing all the specified Coordinates.
 */
goog.math.Box.boundingBox = function(var_args) {
  var box = new goog.math.Box(arguments[0].y, arguments[0].x,
                              arguments[0].y, arguments[0].x);
  for (var i = 1; i < arguments.length; i++) {
    var coord = arguments[i];
    box.top = Math.min(box.top, coord.y);
    box.right = Math.max(box.right, coord.x);
    box.bottom = Math.max(box.bottom, coord.y);
    box.left = Math.min(box.left, coord.x);
  }
  return box;
};


/**
 * Creates a copy of the box with the same dimensions.
 * @return {goog.math.Box} A clone of this Box.
 */
goog.math.Box.prototype.clone = function() {
  return new goog.math.Box(this.top, this.right, this.bottom, this.left);
};


if (goog.DEBUG) {
  /**
   * Returns a nice string representing the box.
   * @return {string} In the form (50t, 73r, 24b, 13l).
   */
  goog.math.Box.prototype.toString = function() {
    return '(' + this.top + 't, ' + this.right + 'r, ' + this.bottom + 'b, ' +
           this.left + 'l)';
  };
}


/**
 * Returns whether the box contains a coordinate.
 *
 * @param {goog.math.Coordinate} coord The Coordinate.
 * @return {boolean} Whether this Box contains the given coordinate.
 */
goog.math.Box.prototype.contains = function(coord) {
  return goog.math.Box.contains(this, coord);
};


/**
 * Expands box with the given margins.
 *
 * @param {number|goog.math.Box} top Top margin or box with all margins.
 * @param {number} opt_right Right margin.
 * @param {number} opt_bottom Bottom margin.
 * @param {number} opt_left Left margin.
 * @return {goog.math.Box} A reference to this Box.
 */
goog.math.Box.prototype.expand = function(top, opt_right, opt_bottom,
    opt_left) {
  if (goog.isObject(top)) {
    this.top -= top.top;
    this.right += top.right;
    this.bottom += top.bottom;
    this.left -= top.left;
  } else {
    this.top -= top;
    this.right += opt_right;
    this.bottom += opt_bottom;
    this.left -= opt_left;
  }

  return this;
};


/**
 * Compares boxes for equality.
 * @param {goog.math.Box} a A Box.
 * @param {goog.math.Box} b A Box.
 * @return {boolean} True iff the boxes are equal, or if both are null.
 */
goog.math.Box.equals = function(a, b) {
  if (a == b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return a.top == b.top && a.right == b.right &&
         a.bottom == b.bottom && a.left == b.left;
};


/**
 * Returns whether a box contains a coordinate.
 *
 * @param {goog.math.Box} box A Box.
 * @param {goog.math.Coordinate} coord A Coordinate.
 * @return {boolean} Whether the box contains the coordinate.
 */
goog.math.Box.contains = function(box, coord) {
  if (!box || !coord) {
    return false;
  }

  return coord.x >= box.left && coord.x <= box.right &&
         coord.y >= box.top && coord.y <= box.bottom;
};


/**
 * Returns the distance between a coordinate and the nearest corner/side of a
 * box. Returns zero if the coordinate is inside the box.
 *
 * @param {goog.math.Box} box A Box.
 * @param {goog.math.Coordinate} coord A Coordinate.
 * @return {number} The distance between {@code coord} and the nearest
 *     corner/side of {@code box}, or zero if {@code coord} is inside
 *     {@code box}.
 */
goog.math.Box.distance = function(box, coord) {
  if (coord.x >= box.left && coord.x <= box.right) {
    if (coord.y >= box.top && coord.y <= box.bottom) {
      return 0;
    }
    return coord.y < box.top ? box.top - coord.y : coord.y - box.bottom;
  }

  if (coord.y >= box.top && coord.y <= box.bottom) {
    return coord.x < box.left ? box.left - coord.x : coord.x - box.right;
  }

  return goog.math.Coordinate.distance(coord,
      new goog.math.Coordinate(coord.x < box.left ? box.left : box.right,
                               coord.y < box.top ? box.top : box.bottom));
};

// Copyright 2006 Google Inc.
// All Rights Reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 
//  * Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
//  * Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in
//    the documentation and/or other materials provided with the
//    distribution.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
// INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
// BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
// LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
// ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE. 

/**
 * @fileoverview A utility class for representing rectangles.
 */


goog.provide('goog.math.Rect');

goog.require('goog.math.Box');


/**
 * Class for representing rectangular regions.
 * @param {number} x Left.
 * @param {number} y Top.
 * @param {number} w Width.
 * @param {number} h Height.
 * @constructor
 */
goog.math.Rect = function(x, y, w, h) {
  /**
   * Left
   * @type {number}
   */
  this.left = x;

  /**
   * Top
   * @type {number}
   */
  this.top = y;

  /**
   * Width
   * @type {number}
   */
  this.width = w;

  /**
   * Height
   * @type {number}
   */
  this.height = h;
};


/**
 * Returns a new copy of the rectangle.
 * @return {goog.math.Rect} A clone of this Rectangle.
 */
goog.math.Rect.prototype.clone = function() {
  return new goog.math.Rect(this.left, this.top, this.width, this.height);
};


/**
 * Returns a new Box object with the same position and dimensions as this
 * rectangle.
 * @return {goog.math.Box} A new Box representation of this Rectangle.
 */
goog.math.Rect.prototype.toBox = function() {
  var right = this.left + this.width;
  var bottom = this.top + this.height;
  return new goog.math.Box(this.top,
                           right,
                           bottom,
                           this.left);
};


/**
 * Creates a new Rect object with the same position and dimensions as a given
 * Box.  Note that this is only the inverse of toBox if left/top are defined.
 * @param {goog.math.Box} box A box.
 * @return {goog.math.Rect} A new Rect initialized with the box's position
 *     and size.
 */
goog.math.Rect.createFromBox = function(box) {
  return new goog.math.Rect(box.left, box.top,
      box.right - box.left, box.bottom - box.top);
};


if (goog.DEBUG) {
  /**
   * Returns a nice string representing size and dimensions of rectangle.
   * @return {string} In the form (50, 73 - 75w x 25h).
   */
  goog.math.Rect.prototype.toString = function() {
    return '(' + this.left + ', ' + this.top + ' - ' + this.width + 'w x ' +
           this.height + 'h)';
  };
}


/**
 * Compares rectangles for equality.
 * @param {goog.math.Rect} a A Rectangle.
 * @param {goog.math.Rect} b A Rectangle.
 * @return {boolean} True iff the rectangles have the same left, top, width,
 *     and height, or if both are null.
 */
goog.math.Rect.equals = function(a, b) {
  if (a == b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return a.left == b.left && a.width == b.width &&
         a.top == b.top && a.height == b.height;
};


/**
 * Computes the intersection of this rectangle and the rectangle parameter.  If
 * there is no intersection, returns false and leaves this rectangle as is.
 * @param {goog.math.Rect} rect A Rectangle.
 * @return {boolean} True iff this rectangle intersects with the parameter.
 */
goog.math.Rect.prototype.intersection = function(rect) {
  var x0 = Math.max(this.left, rect.left);
  var x1 = Math.min(this.left + this.width, rect.left + rect.width);

  if (x0 <= x1) {
    var y0 = Math.max(this.top, rect.top);
    var y1 = Math.min(this.top + this.height, rect.top + rect.height);

    if (y0 <= y1) {
      this.left = x0;
      this.top = y0;
      this.width = x1 - x0;
      this.height = y1 - y0;

      return true;
    }
  }
  return false;
};


/**
 * Returns the intersection of two rectangles. Two rectangles intersect if they
 * touch at all, for example, two zero width and height rectangles would
 * intersect if they had the same top and left.
 * @param {goog.math.Rect} a A Rectangle.
 * @param {goog.math.Rect} b A Rectangle.
 * @return {goog.math.Rect?} A new intersection rect (even if width and height
 *     are 0), or null if there is no intersection.
 */
goog.math.Rect.intersection = function(a, b) {
  // There is no nice way to do intersection via a clone, because any such
  // clone might be unnecessary if this function returns null.  So, we duplicate
  // code from above.

  var x0 = Math.max(a.left, b.left);
  var x1 = Math.min(a.left + a.width, b.left + b.width);

  if (x0 <= x1) {
    var y0 = Math.max(a.top, b.top);
    var y1 = Math.min(a.top + a.height, b.top + b.height);

    if (y0 <= y1) {
      return new goog.math.Rect(x0, y0, x1 - x0, y1 - y0);
    }
  }
  return null;
};


/**
 * Returns whether two rectangles intersect. Two rectangles intersect if they
 * touch at all, for example, two zero width and height rectangles would
 * intersect if they had the same top and left.
 * @param {goog.math.Rect} a A Rectangle.
 * @param {goog.math.Rect} b A Rectangle.
 * @return {boolean} Whether a and b intersect.
 */
goog.math.Rect.intersects = function(a, b) {
  var x0 = Math.max(a.left, b.left);
  var x1 = Math.min(a.left + a.width, b.left + b.width);

  if (x0 <= x1) {
    var y0 = Math.max(a.top, b.top);
    var y1 = Math.min(a.top + a.height, b.top + b.height);

    if (y0 <= y1) {
      return true;
    }
  }
  return false;
};


/**
 * Returns whether a rectangle intersects this rectangle.
 * @param {goog.math.Rect} rect A rectangle.
 * @return {boolean} Whether rect intersects this rectangle.
 */
goog.math.Rect.prototype.intersects = function(rect) {
  return goog.math.Rect.intersects(this, rect);
};


/**
 * Computes the difference regions between two rectangles. The return value is
 * an array of 0 to 4 rectangles defining the remaining regions of the first
 * rectangle after the second has been subtracted.
 * @param {goog.math.Rect} a A Rectangle.
 * @param {goog.math.Rect} b A Rectangle.
 * @return {Array.<goog.math.Rect>} An array with 0 to 4 rectangles which
 *     together define the difference area of rectangle a minus rectangle b.
 */
goog.math.Rect.difference = function(a, b) {
  var intersection = goog.math.Rect.intersection(a, b);
  if (!intersection || !intersection.height || !intersection.width) {
    return [a.clone()];
  }

  var result = [];

  var top = a.top;
  var height = a.height;

  var ar = a.left + a.width;
  var ab = a.top + a.height;

  var br = b.left + b.width;
  var bb = b.top + b.height;

  // Subtract off any area on top where A extends past B
  if (b.top > a.top) {
    result.push(new goog.math.Rect(a.left, a.top, a.width, b.top - a.top));
    top = b.top;
    // If we're moving the top down, we also need to subtract the height diff.
    height -= b.top - a.top;
  }
  // Subtract off any area on bottom where A extends past B
  if (bb < ab) {
    result.push(new goog.math.Rect(a.left, bb, a.width, ab - bb));
    height = bb - top;
  }
  // Subtract any area on left where A extends past B
  if (b.left > a.left) {
    result.push(new goog.math.Rect(a.left, top, b.left - a.left, height));
  }
  // Subtract any area on right where A extends past B
  if (br < ar) {
    result.push(new goog.math.Rect(br, top, ar - br, height));
  }

  return result;
};


/**
 * Computes the difference regions between this rectangle and {@code rect}. The
 * return value is an array of 0 to 4 rectangles defining the remaining regions
 * of this rectangle after the other has been subtracted.
 * @param {goog.math.Rect} rect A Rectangle.
 * @return {Array.<goog.math.Rect>} An array with 0 to 4 rectangles which
 *     together define the difference area of rectangle a minus rectangle b.
 */
goog.math.Rect.prototype.difference = function(rect) {
  return goog.math.Rect.difference(this, rect);
};


/**
 * Expand this rectangle to also include the area of the given rectangle.
 * @param {goog.math.Rect} rect The other rectangle.
 */
goog.math.Rect.prototype.boundingRect = function(rect) {
  // We compute right and bottom before we change left and top below.
  var right = Math.max(this.left + this.width, rect.left + rect.width);
  var bottom = Math.max(this.top + this.height, rect.top + rect.height);

  this.left = Math.min(this.left, rect.left);
  this.top = Math.min(this.top, rect.top);

  this.width = right - this.left;
  this.height = bottom - this.top;
};


/**
 * Returns a new rectangle which completely contains both input rectangles.
 * @param {goog.math.Rect} a A rectangle.
 * @param {goog.math.Rect} b A rectangle.
 * @return {goog.math.Rect?} A new bounding rect, or null if either rect is
 *     null.
 */
goog.math.Rect.boundingRect = function(a, b) {
  if (!a || !b) {
    return null;
  }

  var clone = a.clone();
  clone.boundingRect(b);

  return clone;
};

/**
 * Tests whether this rectangle entirely contains another.
 * @param {goog.math.Rect} rect The rectangle to test for containment.
 * @return {boolean} Whether the test rectangle fits entirely within this one.
 */
goog.math.Rect.prototype.contains = function(rect) {
  return this.left <= rect.left &&
         this.left + this.width >= rect.left + rect.width &&
         this.top <= rect.top &&
         this.top + this.height >= rect.top + rect.height;
};

// Copyright 2006 Google Inc.
// All Rights Reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 
//  * Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
//  * Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in
//    the documentation and/or other materials provided with the
//    distribution.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
// INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
// BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
// LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
// ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE. 

/**
 * @fileoverview Utilities for adding, removing and setting classes.
 *
 */


goog.provide('goog.dom.classes');


goog.require('goog.array');


/**
 * Sets the entire class name of an element.
 * @param {Element} element DOM node to set class of.
 * @param {string} className Class name(s) to apply to element.
 */
goog.dom.classes.set = function(element, className) {
  element.className = className;
};


/**
 * Gets an array of class names on an element
 * @param {Element} element DOM node to get class of.
 * @return {Array} Class names on {@code element}.
 */
goog.dom.classes.get = function(element) {
  var className = element.className;
  // Some types of elements don't have a className in IE (e.g. iframes).
  // Furthermore, in Firefox, className is not a string when the element is
  // an SVG element.
  return className && typeof className.split == 'function' ?
      className.split(' ') : [];
};


/**
 * Adds a class or classes to an element. Does not add multiples of class names.
 * @param {Element} element DOM node to add class to.
 * @param {string} var_args Class names to add.
 * @return {boolean} Whether class was added (or all classes were added).
 */
goog.dom.classes.add = function(element, var_args) {
  var classes = goog.dom.classes.get(element);
  var args = goog.array.slice(arguments, 1);

  var b = goog.dom.classes.add_(classes, args);
  element.className = classes.join(' ');

  return b;
};


/**
 * Removes a class or classes from an element.
 * @param {Element} element DOM node to remove class from.
 * @param {string} var_args Class name(s) to remove.
 * @return {boolean} Whether all classes in {@code var_args} were found and
 *     removed.
 */
goog.dom.classes.remove = function(element, var_args) {
  var classes = goog.dom.classes.get(element);
  var args = goog.array.slice(arguments, 1);

  var b = goog.dom.classes.remove_(classes, args);
  element.className = classes.join(' ');

  return b;
};


/**
 * Helper method for {@link goog.dom.classes.add} and
 * {@link goog.dom.classes.addRemove}. Adds one or more classes to the supplied
 * classes array.
 * @param {Array.<string>} classes All class names for the element, will be
 *     updated to have the classes supplied in {@code args} added.
 * @param {Array.<string>} args Class names to add.
 * @return {boolean} Whether all classes in were added.
 * @private
 */
goog.dom.classes.add_ = function(classes, args) {
  var rv = 0;
  for (var i = 0; i < args.length; i++) {
    if (!goog.array.contains(classes, args[i])) {
      classes.push(args[i]);
      rv++;
    }
  }
  return rv == args.length;
};


/**
 * Helper method for {@link goog.dom.classes.remove} and
 * {@link goog.dom.classes.addRemove}. Removes one or more classes from the
 * supplied classes array.
 * @param {Array.<string>} classes All class names for the element, will be
 *     updated to have the classes supplied in {@code args} removed.
 * @param {Array.<string>} args Class names to remove.
 * @return {boolean} Whether all classes in were found and removed.
 * @private
 */
goog.dom.classes.remove_ = function(classes, args) {
  var rv = 0;
  for (var i = 0; i < classes.length; i++) {
    if (goog.array.contains(args, classes[i])) {
      goog.array.splice(classes, i--, 1);
      rv++;
    }
  }
  return rv == args.length;
};


/**
 * Switches a class on an element from one to another without disturbing other
 * classes. If the fromClass isn't removed, the toClass won't be added.
 * @param {Element} element DOM node to swap classes on.
 * @param {string} fromClass Class to remove.
 * @param {string} toClass Class to add.
 * @return {boolean} Whether classes were switched.
 */
goog.dom.classes.swap = function(element, fromClass, toClass) {
  var classes = goog.dom.classes.get(element);

  var removed = false;
  for (var i = 0; i < classes.length; i++) {
    if (classes[i] == fromClass) {
      goog.array.splice(classes, i--, 1);
      removed = true;
    }
  }

  if (removed) {
    classes.push(toClass);
    element.className = classes.join(' ');
  }

  return removed;
};


/**
 * Adds zero or more classes to and element and and removes zero or more as a
 * single operation. Unlike calling {@link goog.dom.classes.add} and
 * {@link goog.dom.classes.remove} separately this is more efficient as it only
 * parses the class property once.
 * @param {Element} element DOM node to swap classes on.
 * @param {string|Array.<string>|null} classesToRemove Class or classes to
 *     remove, if null no classes are removed.
 * @param {string|Array.<string>|null} classesToAdd Class or classes to add, if
 *     null no classes are added.
 */
goog.dom.classes.addRemove = function(element, classesToRemove, classesToAdd) {
  var classes = goog.dom.classes.get(element);
  if (goog.isString(classesToRemove)) {
    goog.array.remove(classes, classesToRemove);
  } else if (goog.isArray(classesToRemove)) {
    goog.dom.classes.remove_(classes, classesToRemove);
  }

  if (goog.isString(classesToAdd) &&
      !goog.array.contains(classes, classesToAdd)) {
    classes.push(classesToAdd);
  } else if (goog.isArray(classesToAdd)) {
    goog.dom.classes.add_(classes, classesToAdd);
  }

  element.className = classes.join(' ');
};


/**
 * Returns true if an element has a class.
 * @param {Element} element DOM node to test.
 * @param {string} className Class name to test for.
 * @return {boolean} Whether element has the class.
 */
goog.dom.classes.has = function(element, className) {
  return goog.array.contains(goog.dom.classes.get(element), className);
};


/**
 * Adds or removes a class depending on the enabled argument.
 * @param {Element} element DOM node to add or remove the class on.
 * @param {string} className Class name to add or remove.
 * @param {boolean} enabled Whether to add or remove the class (true adds,
 *     false removes).
 */
goog.dom.classes.enable = function(element, className, enabled) {
  if (enabled) {
    goog.dom.classes.add(element, className);
  } else {
    goog.dom.classes.remove(element, className);
  }
};


/**
 * Removes a class if an element has it, and adds it the element doesn't have
 * it.  Won't affect other classes on the node.
 * @param {Element} element DOM node to toggle class on.
 * @param {string} className Class to toggle.
 * @return {boolean} True if class was added, false if it was removed
 *     (in other words, whether element has the class after this function has
 *     been called).
 */
goog.dom.classes.toggle = function(element, className) {
  var add = !goog.dom.classes.has(element, className);
  goog.dom.classes.enable(element, className, add);
  return add;
};

// Copyright 2005 Google Inc.
// All Rights Reserved
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 
//  * Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
//  * Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in
//    the documentation and/or other materials provided with the
//    distribution.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
// INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
// BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
// LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
// ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE. 

/**
 * @fileoverview Implements the disposable interface. The dispose method is used
 * to clean up references and resources.
 */


goog.provide('goog.Disposable');
goog.provide('goog.dispose');


/**
 * Class that provides the basic implementation for disposable objects. If your
 * class holds one or more references to COM objects, DOM nodes, or other
 * disposable objects, it should extend this class or implement the disposable
 * interface.
 * @constructor
 */
goog.Disposable = function() {};


/**
 * Whether the object has been disposed of.
 * @type {boolean}
 * @private
 */
goog.Disposable.prototype.disposed_ = false;


/**
 * @return {boolean} Whether the object has been disposed of.
 */
goog.Disposable.prototype.isDisposed = function() {
  return this.disposed_;
};


/**
 * @return {boolean} Whether the object has been disposed of.
 * @deprecated Use {@link #isDisposed} instead.
 */
goog.Disposable.prototype.getDisposed = goog.Disposable.prototype.isDisposed;


/**
 * Disposes of the object. If the object hasn't already been disposed of, calls
 * {@link #disposeInternal}. Classes that extend {@code goog.Disposable} should
 * override {@link #disposeInternal} in order to delete references to COM
 * objects, DOM nodes, and other disposable objects.
 */
goog.Disposable.prototype.dispose = function() {
  if (!this.disposed_) {
    // Set disposed_ to true first, in case during the chain of disposal this
    // gets disposed recursively.
    this.disposed_ = true;
    this.disposeInternal();
  }
};


/**
 * Deletes or nulls out any references to COM objects, DOM nodes, or other
 * disposable objects. Classes that extend {@code goog.Disposable} should
 * override this method.  For example:
 * <pre>
 *   mypackage.MyClass = function() {
 *     goog.Disposable.call(this);
 *     // Constructor logic specific to MyClass.
 *     ...
 *   };
 *   goog.inherits(mypackage.MyClass, goog.Disposable);
 *
 *   mypackage.MyClass.prototype.disposeInternal = function() {
 *     mypackage.MyClass.superClass_.disposeInternal.call(this);
 *     // Dispose logic specific to MyClass.
 *     ...
 *   };
 * </pre>
 * @protected
 */
goog.Disposable.prototype.disposeInternal = function() {
  // No-op in the base class.
};


/**
 * Calls {@code dispose} on the argument if it supports it.
 * @param {Object} obj The object to dispose of.
 */
goog.dispose = function(obj) {
  if (typeof obj.dispose == 'function') {
    obj.dispose();
  }
};

// Copyright 2005 Google Inc.
// All Rights Reserved
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 
//  * Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
//  * Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in
//    the documentation and/or other materials provided with the
//    distribution.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
// INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
// BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
// LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
// ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE. 

/**
 * @fileoverview A base class for event objects.
 *
 */


goog.provide('goog.events.Event');

goog.require('goog.Disposable');


/**
 * A base class for event objects, so that they can support preventDefault and
 * stopPropagation.
 *
 * @param {string} type Event Type.
 * @param {Object} opt_target Reference to the object that is the target of this
 *     event.
 * @constructor
 * @extends {goog.Disposable}
 */
goog.events.Event = function(type, opt_target) {
  // Although Event extends Disposable, goog.Disposable.call(this) is omitted
  // for performance reasons.

  /**
   * Event type.
   * @type {string}
   */
  this.type = type;

  /**
   * Target of the event.
   * @type {Object|undefined}
   */
  this.target = opt_target;

  /**
   * Object that had the listener attached.
   * @type {Object|undefined}
   */
  this.currentTarget = this.target;
};
goog.inherits(goog.events.Event, goog.Disposable);


/**
 * {@inheritDoc}
 */
goog.events.Event.prototype.disposeInternal = function() {
  delete this.type;
  delete this.target;
  delete this.currentTarget;
};


/**
 * Whether to cancel the event in internal capture/bubble processing for IE.
 * @type {boolean}
 * @private
 */
goog.events.Event.prototype.propagationStopped_ = false;


/**
 * Return value for in internal capture/bubble processing for IE.
 * @type {boolean}
 * @private
 */
goog.events.Event.prototype.returnValue_ = true;


/**
 * Stops event propagation.
 */
goog.events.Event.prototype.stopPropagation = function() {
  this.propagationStopped_ = true;
};


/**
 * Prevents the default action, for example a link redirecting to a url.
 */
goog.events.Event.prototype.preventDefault = function() {
  this.returnValue_ = false;
};

// Copyright 2006 Google Inc.
// All Rights Reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 
//  * Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
//  * Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in
//    the documentation and/or other materials provided with the
//    distribution.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
// INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
// BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
// LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
// ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE. 

/**
 * @fileoverview Utilities for string manipulation.
 */


/**
 * Namespace for string utilities
 */
goog.provide('goog.string');
goog.provide('goog.string.Unicode');


/**
 * Common Unicode string characters.
 * @enum {string}
 */
goog.string.Unicode = {
  NBSP: '\xa0'
};


/**
 * Fast prefix-checker.
 * @param {string} str The string to check.
 * @param {string} prefix A string to look for at the start of {@code str}.
 * @return {boolean} True if {@code str} begins with {@code prefix}.
 */
goog.string.startsWith = function(str, prefix) {
  return str.indexOf(prefix) == 0;
};


/**
 * Fast suffix-checker.
 * @param {string} str The string to check.
 * @param {string} suffix A string to look for at the end of {@code str}.
 * @return {boolean} True if {@code str} ends with {@code suffix}.
 */
goog.string.endsWith = function(str, suffix) {
  var l = str.length - suffix.length;
  return l >= 0 && str.lastIndexOf(suffix, l) == l;
};


/**
 * Case-insensitive prefix-checker.
 * @param {string} str The string to check.
 * @param {string} prefix  A string to look for at the end of {@code str}.
 * @return {boolean} True if {@code str} begins with {@code prefix} (ignoring
 *     case).
 */
goog.string.caseInsensitiveStartsWith = function(str, prefix) {
  return goog.string.caseInsensitiveCompare(
      prefix, str.substr(0, prefix.length)) == 0;
};


/**
 * Case-insensitive suffix-checker.
 * @param {string} str The string to check.
 * @param {string} suffix A string to look for at the end of {@code str}.
 * @return {boolean} True if {@code str} ends with {@code suffix} (ignoring
 *     case).
 */
goog.string.caseInsensitiveEndsWith = function(str, suffix) {
  return goog.string.caseInsensitiveCompare(
      suffix, str.substr(str.length - suffix.length, suffix.length)) == 0;
};


/**
 * Does simple python-style string substitution.
 * subs("foo%s hot%s", "bar", "dog") becomes "foobar hotdog".
 * @param {string} str The string containing the pattern.
 * @param {*} var_args The items to substitute into the pattern.
 * @return {string} A copy of {@code str} in which each occurrence of
 *     {@code %s} has been replaced an argument from {@code var_args}.
 */
goog.string.subs = function(str, var_args) {
  // This appears to be slow, but testing shows it compares more or less
  // equivalent to the regex.exec method.
  for (var i = 1; i < arguments.length; i++) {
    // We cast to String in case an argument is a Function.  Replacing $&, for
    // example, with $$$& stops the replace from subsituting the whole match
    // into the resultant string.  $$$& in the first replace becomes $$& in the
    //  second, which leaves $& in the resultant string.  Also:
    // $$, $`, $', $n $nn
    var replacement = String(arguments[i]).replace(/\$/g, '$$$$');
    str = str.replace(/\%s/, replacement);
  }
  return str;
};


/**
 * Converts multiple whitespace chars (spaces, non-breaking-spaces, new lines
 * and tabs) to a single space, and strips leading and trailing whitespace.
 * @param {string} str Input string.
 * @return {string} A copy of {@code str} with collapsed whitespace.
 */
goog.string.collapseWhitespace = function(str) {
  // Since IE doesn't include non-breaking-space (0xa0) in their \s character
  // class (as required by section 7.2 of the ECMAScript spec), we explicitly
  // include it in the regexp to enforce consistent cross-browser behavior.
  return str.replace(/[\s\xa0]+/g, ' ').replace(/^\s+|\s+$/g, '');
};


/**
 * Checks if a string is empty or contains only whitespaces.
 * @param {string} str The string to check.
 * @return {boolean} True if {@code str} is empty or whitespace only.
 */
goog.string.isEmpty = function(str) {
  // testing length == 0 first is actually slower in all browsers (about the
  // same in Opera).
  // Since IE doesn't include non-breaking-space (0xa0) in their \s character
  // class (as required by section 7.2 of the ECMAScript spec), we explicitly
  // include it in the regexp to enforce consistent cross-browser behavior.
  return /^[\s\xa0]*$/.test(str);
};


/**
 * Checks if a string is null, empty or contains only whitespaces.
 * @param {string} str The string to check.
 * @return {boolean} True if{@code str} is null, empty, or whitespace only.
 */
goog.string.isEmptySafe = function(str) {
  return goog.string.isEmpty(goog.string.makeSafe(str));
};


/**
 * Checks if a string is all breaking whitespace.
 * @param {string} str The string to check.
 * @return {boolean} Whether the string is all breaking whitespace.
 */
goog.string.isBreakingWhitespace = function(str) {
  return !/[^\t\n\r ]/.test(str);
};


/**
 * Checks if a string contains all letters.
 * @param {string} str string to check.
 * @return {boolean} True if {@code str} consists entirely of letters.
 */
goog.string.isAlpha = function(str) {
  return !/[^a-zA-Z]/.test(str);
};


/**
 * Checks if a string contains only numbers.
 * @param {*} str string to check. If not a string, it will be
 *     casted to one.
 * @return {boolean} True if {@code str} is numeric.
 */
goog.string.isNumeric = function(str) {
  return !/[^0-9]/.test(str);
};


/**
 * Checks if a string contains only numbers or letters.
 * @param {string} str string to check.
 * @return {boolean} True if {@code str} is alphanumeric.
 */
goog.string.isAlphaNumeric = function(str) {
  return !/[^a-zA-Z0-9]/.test(str);
};


/**
 * Checks if a character is a space character.
 * @param {string} ch Character to check.
 * @return {boolean} True if {code ch} is a space.
 */
goog.string.isSpace = function(ch) {
  return ch == ' ';
};


/**
 * Checks if a character is a valid unicode character.
 * @param {string} ch Character to check.
 * @return {boolean} True if {code ch} is a valid unicode character.
 */
goog.string.isUnicodeChar = function(ch) {
  return ch.length == 1 && ch >= ' ' && ch <= '~' ||
         ch >= '\u0080' && ch <= '\uFFFD';
};


/**
 * Takes a string and replaces newlines with a space. Multiple lines are
 * replaced with a single space.
 * @param {string} str The string from which to strip newlines.
 * @return {string} A copy of {@code str} stripped of newlines.
 */
goog.string.stripNewlines = function(str) {
  return str.replace(/(\r\n|\r|\n)+/g, ' ');
};


/**
 * Replaces Windows and Mac new lines with unix style: \r or \r\n with \n.
 * @param {string} str The string to in which to canonicalize newlines.
 * @return {string} {@code str} A copy of {@code} with canonicalized newlines.
 */
goog.string.canonicalizeNewlines = function(str) {
  return str.replace(/(\r\n|\r|\n)/g, '\n');
};


/**
 * Normalizes whitespace in a string, replacing all whitespace chars with
 * a space.
 * @param {string} str The string in which to normalize whitespace.
 * @return {string} A copy of {@code str} with all whitespace normalized.
 */
goog.string.normalizeWhitespace = function(str) {
  return str.replace(/\xa0|\s/g, ' ');
};


/**
 * Normalizes spaces in a string, replacing all consecutive spaces and tabs
 * with a single space. Replaces non-breaking space with a space.
 * @param {string} str The string in which to normalize spaces.
 * @return {string} A copy of {@code str} with all consecutive spaces and tabs
 *    replaced with a single space.
 */
goog.string.normalizeSpaces = function(str) {
  return str.replace(/\xa0|[ \t]+/g, ' ');
};


/**
 * Trims white spaces to the left and right of a string.
 * @param {string} str The string to trim.
 * @return {string} A trimmed copy of {@code str}.
 */
goog.string.trim = function(str) {
  // Since IE doesn't include non-breaking-space (0xa0) in their \s character
  // class (as required by section 7.2 of the ECMAScript spec), we explicitly
  // include it in the regexp to enforce consistent cross-browser behavior.
  return str.replace(/^[\s\xa0]+|[\s\xa0]+$/g, '');
};


/**
 * Trims whitespaces at the left end of a string.
 * @param {string} str The string to left trim.
 * @return {string} A trimmed copy of {@code str}.
 */
goog.string.trimLeft = function(str) {
  // Since IE doesn't include non-breaking-space (0xa0) in their \s character
  // class (as required by section 7.2 of the ECMAScript spec), we explicitly
  // include it in the regexp to enforce consistent cross-browser behavior.
  return str.replace(/^[\s\xa0]+/, '');
};


/**
 * Trims whitespaces at the right end of a string.
 * @param {string} str The string to right trim.
 * @return {string} A trimmed copy of {@code str}.
 */
goog.string.trimRight = function(str) {
  // Since IE doesn't include non-breaking-space (0xa0) in their \s character
  // class (as required by section 7.2 of the ECMAScript spec), we explicitly
  // include it in the regexp to enforce consistent cross-browser behavior.
  return str.replace(/[\s\xa0]+$/, '');
};


/**
 * A string comparator that ignores case.
 * -1 = str1 less than str2
 *  0 = str1 equals str2
 *  1 = str1 greater than str2
 *
 * @param {string} str1 The string to compare.
 * @param {string} str2 The string to compare {@code str1} to.
 * @return {number} The comparator result, as described above.
 */
goog.string.caseInsensitiveCompare = function(str1, str2) {
  var test1 = String(str1).toLowerCase();
  var test2 = String(str2).toLowerCase();

  if (test1 < test2) {
    return -1;
  } else if (test1 == test2) {
    return 0;
  } else {
    return 1;
  }
};


/**
 * Regular expression used for splitting a string into substrings of fractional
 * numbers, integers, and non-numeric characters.
 * @type {RegExp}
 * @private
 */
goog.string.numerateCompareRegExp_ = /(\.\d+)|(\d+)|(\D+)/g;


/**
 * String comparison function that handles numbers in a way humans might expect.
 * Using this function, the string "File 2.jpg" sorts before "File 10.jpg". The
 * comparison is mostly case-insensitive, though strings that are identical
 * except for case are sorted with the upper-case strings before lower-case.
 *
 * This comparison function is significantly slower (about 500x) than either
 * the default or the case-insensitive compare. It should not be used in
 * time-critical code, but should be fast enough to sort several hundred short
 * strings (like filenames) with a reasonable delay.
 *
 * @param {string} str1 The string to compare in a numerically sensitive way.
 * @param {string} str2 The string to compare {@code str1} to.
 * @return {number} less than 0 if str1 < str2, 0 if str1 == str2, greater than
 *     0 if str1 > str2.
 */
goog.string.numerateCompare = function(str1, str2) {
  if (str1 == str2) {
    return 0;
  }
  if (!str1) {
    return -1;
  }
  if (!str2) {
    return 1;
  }

  // Using match to split the entire string ahead of time turns out to be faster
  // for most inputs than using RegExp.exec or iterating over each character.
  var tokens1 = str1.toLowerCase().match(goog.string.numerateCompareRegExp_);
  var tokens2 = str2.toLowerCase().match(goog.string.numerateCompareRegExp_);

  var count = Math.min(tokens1.length, tokens2.length);

  for (var i = 0; i < count; i++) {
    var a = tokens1[i];
    var b = tokens2[i];

    // Compare pairs of tokens, returning if one token sorts before the other.
    if (a != b) {

      // Only if both tokens are integers is a special comparison required.
      // Decimal numbers are sorted as strings (e.g., '.09' < '.1').
      var num1 = parseInt(a, 10);
      if (!isNaN(num1)) {
        var num2 = parseInt(b, 10);
        if (!isNaN(num2) && num1 - num2) {
          return num1 - num2;
        }
      }
      return a < b ? -1 : 1;
    }
  }

  // If one string is a substring of the other, the shorter string sorts first.
  if (tokens1.length != tokens2.length) {
    return tokens1.length - tokens2.length;
  }

  // The two strings must be equivalent except for case (perfect equality is
  // tested at the head of the function.) Revert to default ASCII-betical string
  // comparison to stablize the sort.
  return str1 < str2 ? -1 : 1;
};


/**
 * Regular expression used for determining if a string needs to be encoded.
 * @type {RegExp}
 * @private
 */
goog.string.encodeUriRegExp_ = /^[a-zA-Z0-9\-_.!~*'()]*$/;

/**
 * URL-encodes a string
 * @param {*} str The string to url-encode.
 * @return {string} An encoded copy of {@code str} that is safe for urls.
 *     Note that '#', ':', and other characters used to delimit portions
 *     of URLs *will* be encoded.
 */
goog.string.urlEncode = function(str) {
  str = String(str);
  // Checking if the search matches before calling encodeURIComponent avoids an
  // extra allocation in IE6. This adds about 10us time in FF and a similiar
  // over head in IE6 for lower working set apps, but for large working set
  // apps like Gmail, it saves about 70us per call.
  if (!goog.string.encodeUriRegExp_.test(str)) {
    return encodeURIComponent(str);
  }

  return /** @type {string} */ (str);
};


/**
 * URL-decodes the string. We need to specially handle '+'s because
 * the javascript library doesn't convert them to spaces.
 * @param {string} str The string to url decode.
 * @return {string} The decoded {@code str}.
 */
goog.string.urlDecode = function(str) {
  return decodeURIComponent(str.replace(/\+/g, ' '));
};


/**
 * Converts \n to <br>s or <br />s.
 * @param {string} str The string in which to convert newlines.
 * @param {boolean} opt_xml Whether to use XML compatible tags.
 * @return {string} A copy of {@code str} with converted newlines.
 */
goog.string.newLineToBr = function(str, opt_xml) {
  return str.replace(/(\r\n|\r|\n)/g, opt_xml ? '<br />' : '<br>');
};


/**
 * Escape double quote '"' characters in addition to '&', '<', and '>' so that a
 * string can be included in an HTML tag attribute value within double quotes.
 *
 * It should be noted that > doesn't need to be escaped for the HTML or XML to
 * be valid, but it has been decided to escape it for consistency with other
 * implementations.
 *
 * NOTE(pupius):
 * HtmlEscape is often called during the generation of large blocks of HTML.
 * Using statics for the regular expressions and strings is an optimization
 * that can more than half the amount of time IE spends in this function for
 * large apps, since strings and regexes both contribute to GC allocations.
 *
 * Testing for the presence of a character before escaping increases the number
 * of function calls, but actually provides a speed increase for the average
 * case -- since the average case often doesn't require the escaping of all 4
 * characters and indexOf() is much cheaper than replace().
 * The worst case does suffer slightly from the additional calls, therefore the
 * opt_isLikelyToContainHtmlChars option has been included for situations
 * where all 4 HTML entities are very likely to be present and need escaping.
 *
 * Some benchmarks (times tended to fluctuate +-0.05ms):
 *                                     FireFox                     IE6
 * (no chars / average (mix of cases) / all 4 chars)
 * no checks                     0.13 / 0.22 / 0.22         0.23 / 0.53 / 0.80
 * indexOf                       0.08 / 0.17 / 0.26         0.22 / 0.54 / 0.84
 * indexOf + re test             0.07 / 0.17 / 0.28         0.19 / 0.50 / 0.85
 *
 * An additional advantage of checking if replace actually needs to be called
 * is a reduction in the number of object allocations, so as the size of the
 * application grows the difference between the various methods would increase.
 *
 * @param {string} str string to be escaped.
 * @param {boolean} opt_isLikelyToContainHtmlChars Don't perform a check to see
 *     if the character needs replacing - use this option if you expect each of
 *     the characters to appear often. Leave false if you expect few html
 *     characters to occur in your strings, such as if you are escaping HTML.
 * @return {string} An escaped copy of {@code str}.
 */
goog.string.htmlEscape = function(str, opt_isLikelyToContainHtmlChars) {

  if (opt_isLikelyToContainHtmlChars) {
    return str.replace(goog.string.amperRe_, '&amp;')
          .replace(goog.string.ltRe_, '&lt;')
          .replace(goog.string.gtRe_, '&gt;')
          .replace(goog.string.quotRe_, '&quot;');

  } else {
    // quick test helps in the case when there are no chars to replace, in
    // worst case this makes barely a difference to the time taken
    if (!goog.string.allRe_.test(str)) return str;

    // str.indexOf is faster than regex.test in this case
    if (str.indexOf('&') != -1) {
      str = str.replace(goog.string.amperRe_, '&amp;');
    }
    if (str.indexOf('<') != -1) {
      str = str.replace(goog.string.ltRe_, '&lt;');
    }
    if (str.indexOf('>') != -1) {
      str = str.replace(goog.string.gtRe_, '&gt;');
    }
    if (str.indexOf('"') != -1) {
      str = str.replace(goog.string.quotRe_, '&quot;');
    }
    return str;
  }
};


/**
 * Regular expression that matches an ampersand, for use in escaping.
 * @type {RegExp}
 * @private
 */
goog.string.amperRe_ = /&/g;


/**
 * Regular expression that matches a less than sign, for use in escaping.
 * @type {RegExp}
 * @private
 */
goog.string.ltRe_ = /</g;


/**
 * Regular expression that matches a greater than sign, for use in escaping.
 * @type {RegExp}
 * @private
 */
goog.string.gtRe_ = />/g;


/**
 * Regular expression that matches a double quote, for use in escaping.
 * @type {RegExp}
 * @private
 */
goog.string.quotRe_ = /\"/g;


/**
 * Regular expression that matches any character that needs to be escaped.
 * @type {RegExp}
 * @private
 */
goog.string.allRe_ = /[&<>\"]/;


/**
 * Unescapes an HTML string.
 *
 * @param {string} str The string to unescape.
 * @return {string} An unescaped copy of {@code str}.
 */
goog.string.unescapeEntities = function(str) {
  if (goog.string.contains(str, '&')) {
    // We are careful not to use a DOM if we do not have one. We use the []
    // notation so that the JSCompiler will not complain about these objects and
    // fields in the case where we have no DOM.
    // If the string contains < then there could be a script tag in there and in
    // that case we fall back to a non DOM solution as well.
    if ('document' in goog.global && !goog.string.contains(str, '<')) {
      return goog.string.unescapeEntitiesUsingDom_(str);
    } else {
      // Fall back on pure XML entities
      return goog.string.unescapePureXmlEntities_(str);
    }
  }
  return str;
};


/**
 * Unescapes an HTML string using a DOM. Don't use this function directly, it
 * should only be used by unescapeEntities. If used directly you will be
 * vulnerable to XSS attacks.
 * @private
 * @param {string} str The string to unescape.
 * @return {string} The unescaped {@code str} string.
 */
goog.string.unescapeEntitiesUsingDom_ = function(str) {
  var el = goog.global['document']['createElement']('a');
  el['innerHTML'] = str;
  // Accesing the function directly triggers some virus scanners.
  if (el[goog.string.NORMALIZE_FN_]) {
    el[goog.string.NORMALIZE_FN_]();
  }
  str = el['firstChild']['nodeValue'];
  el['innerHTML'] = '';
  return str;
};


/**
 * Unescapes XML entities.
 * @private
 * @param {string} str The string to unescape.
 * @return {string} An unescaped copy of {@code str}.
 */
goog.string.unescapePureXmlEntities_ = function(str) {
  return str.replace(/&([^;]+);/g, function(s, entity) {
    switch (entity) {
      case 'amp':
        return '&';
      case 'lt':
        return '<';
      case 'gt':
        return '>';
      case 'quot':
        return '"';
      default:
        if (entity.charAt(0) == '#') {
          var n = Number('0' + entity.substr(1));
          if (!isNaN(n)) {
            return String.fromCharCode(n);
          }
        }
        // For invalid entities we just return the entity
        return s;
    }
  });
};

/**
 * String name for the node.normalize function. Anti-virus programs use this as
 * a signature for some viruses so we need a work around (temporary).
 * @private
 * @type {string}
 */
goog.string.NORMALIZE_FN_ = 'normalize';

/**
 * Do escaping of whitespace to preserve spatial formatting. We use character
 * entity #160 to make it safer for xml.
 * @param {string} str The string in which to escape whitespace.
 * @param {boolean} opt_xml Whether to use XML compatible tags.
 * @return {string} An escaped copy of {@code str}.
 */
goog.string.whitespaceEscape = function(str, opt_xml) {
  return goog.string.newLineToBr(str.replace(/  /g, ' &#160;'), opt_xml);
};


/**
 * Strip quote characters around a string.  The second argument is a string of
 * characters to treat as quotes.  This can be a single character or a string of
 * multiple character and in that case each of those are treated as possible
 * quote characters. For example:
 *
 * <pre>
 * goog.string.stripQuotes('"abc"', '"`') --> 'abc'
 * goog.string.stripQuotes('`abc`', '"`') --> 'abc'
 * </pre>
 *
 * @param {string} str The string to strip.
 * @param {string} quoteChars The quote characters to strip.
 * @return {string} A copy of {@code str} without the quotes.
 *
 */
goog.string.stripQuotes = function(str, quoteChars) {
  var length = quoteChars.length;
  for (var i = 0; i < length; i++) {
    var quoteChar = length == 1 ? quoteChars : quoteChars.charAt(i);
    if (str.charAt(0) == quoteChar && str.charAt(str.length - 1) == quoteChar) {
      return str.substring(1, str.length - 1);
    }
  }
  return str;
};


/**
 * Truncates a string to a certain length and adds '...' if necessary.  The
 * length also accounts for the ellipsis, so a maximum length of 10 and a string
 * 'Hello World!' produces 'Hello W...'.
 * @param {string} str The string to truncate.
 * @param {number} chars Max number of characters.
 * @param {boolean} opt_protectEscapedCharacters Whether to protect escaped
 *     characters from being cut off in the middle.
 * @return {string} The truncated {@code str} string.
 */
goog.string.truncate = function(str, chars, opt_protectEscapedCharacters) {
  if (opt_protectEscapedCharacters) {
    str = goog.string.unescapeEntities(str);
  }

  if (str.length > chars) {
    str = str.substring(0, chars - 3) + '...';
  }

  if (opt_protectEscapedCharacters) {
    str = goog.string.htmlEscape(str);
  }

  return str;
};


/**
 * Truncate a string in the middle, adding "..." if necessary,
 * and favoring the beginning of the string.
 * @param {string} str The string to truncate the middle of.
 * @param {number} chars Max number of characters.
 * @param {boolean} opt_protectEscapedCharacters Whether to protect escaped
 *     characters from being cutoff in the middle.
 * @return {string} A truncated copy of {@code str}.
 */
goog.string.truncateMiddle = function(str, chars,
    opt_protectEscapedCharacters) {
  if (opt_protectEscapedCharacters) {
    str = goog.string.unescapeEntities(str);
  }

  if (str.length > chars) {
    // Favor the beginning of the string:
    var half = Math.floor(chars / 2);
    var endPos = str.length - half;
    half += chars % 2;
    str = str.substring(0, half) + '...' + str.substring(endPos);
  }

  if (opt_protectEscapedCharacters) {
    str = goog.string.htmlEscape(str);
  }

  return str;
};


/**
 * Character mappings used internally for goog.string.quote.
 * @private
 * @type {Object}
 */
goog.string.jsEscapeCache_ = {
  '\b': '\\b',
  '\f': '\\f',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
  '\x0B': '\\x0B', // '\v' is not supported in JScript
  '"': '\\"',
  '\'': '\\\'',
  '\\': '\\\\'
};


/**
 * Encloses a string in double quotes and escapes characters so that the
 * string is a valid JS string.
 * @param {string} s The string to quote.
 * @return {string} A copy of {@code s} surrounded by double quotes.
 */
goog.string.quote = function(s) {
  s = String(s);
  if (s.quote) {
    return s.quote();
  } else {
    var sb = ['"'];
    for (var i = 0; i < s.length; i++) {
      sb[i + 1] = goog.string.escapeChar(s.charAt(i));
    }
    sb.push('"');
    return sb.join('');
  }
};


/**
 * Takes a character and returns the escaped string for that character. For
 * example escapeChar(String.fromCharCode(15)) -> "\\x0E".
 * @param {string} c The character to escape.
 * @return {string} An escaped string representing {@code c}.
 */
goog.string.escapeChar = function(c) {
  if (c in goog.string.jsEscapeCache_) {
    return goog.string.jsEscapeCache_[c];
  }
  var rv = c;
  var cc = c.charCodeAt(0);
  if (cc > 31 && cc < 127) {
    rv = c;
  } else {
    // tab is 9 but handled above
    if (cc < 256) {
      rv = '\\x';
      if (cc < 16 || cc > 256) {
        rv += '0';
      }
    } else {
      rv = '\\u';
      if (cc < 4096) { // \u1000
        rv += '0';
      }
    }
    rv += cc.toString(16).toUpperCase();
  }

  return goog.string.jsEscapeCache_[c] = rv;
};


/**
 * Takes a string and creates a map (Object) in which the keys are the
 * characters in the string. The value for the key is set to true. You can
 * then use goog.object.map or goog.array.map to change the values.
 * @param {string} s The string to build the map from.
 * @return {Object} The map of characters used.
 */
goog.string.toMap = function(s) {
  var rv = {};
  for (var i = 0; i < s.length; i++) {
    rv[s.charAt(i)] = true;
  }
  return rv;
};


/**
 * Checks whether a string contains a given character.
 * @param {string} s The string to test.
 * @param {string} ss The substring to test for.
 * @return {boolean} True if {@code s} contains {@code ss}.
 */
goog.string.contains = function(s, ss) {
  return s.indexOf(ss) != -1;
};


/**
 * Removes a substring of a specified length at a specific
 * index in a string.
 * @param {string} s The base string from which to remove.
 * @param {number} index The index at which to remove the substring.
 * @param {string} stringLength The length of the substring to remove.
 * @return {string} A copy of {@code s} with the substring removed or the full
 *     string if nothing is removed or the input is invalid.
 */
goog.string.removeAt = function(s, index, stringLength) {
  var resultStr = s;
  // If the index is greater or equal to 0 then remove substring
  if (index >= 0 && index < s.length && stringLength > 0) {
    resultStr = s.substr(0, index) +
        s.substr(index + stringLength, s.length - index - stringLength);
  }
  return resultStr;
};


/**
 *  Removes the first occurrence of a substring from a string.
 *  @param {string} s The base string from which to remove.
 *  @param {string} ss The string to remove.
 *  @return {string} A copy of {@code s} with {@code ss} removed or the full
 *      string if nothing is removed.
 */
goog.string.remove = function(s, ss) {
  var re = new RegExp(goog.string.regExpEscape(ss), '');
  return s.replace(re, '');
};


/**
 *  Removes all occurrences of a substring from a string.
 *  @param {string} s The base string from which to remove.
 *  @param {string} ss The string to remove.
 *  @return {string} A copy of {@code s} with {@code ss} removed or the full
 *      string if nothing is removed.
 */
goog.string.removeAll = function(s, ss) {
  var re = new RegExp(goog.string.regExpEscape(ss), 'g');
  return s.replace(re, '');
};


/**
 * Escapes characters in the string that are not safe to use in a RegExp.
 * @param {*} s The string to escape. If not a string, it will be casted
 *     to one.
 * @return {string} A RegExp safe, escaped copy of {@code s}.
 */
goog.string.regExpEscape = function(s) {
  return String(s).replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '\\$1').
                   replace(/\x08/g, '\\x08');
};


/**
 * Repeats a string n times.
 * @param {string} string The string to repeat.
 * @param {number} length The number of times to repeat.
 * @return {string} A string containing {@code length} repetitions of
 *     {@code string}.
 */
goog.string.repeat = function(string, length) {
  return new Array(length + 1).join(string);
};


/**
 * Pads number to given length and optionally rounds it to a given precision.
 * For example:
 * <pre>padNumber(1.25, 2, 3) -> '01.250'
 * padNumber(1.25, 2) -> '01.25'
 * padNumber(1.25, 2, 1) -> '01.3'
 * padNumber(1.25, 0) -> '1.25'</pre>
 *
 * @param {number} num The number to pad.
 * @param {number} length The desired length.
 * @param {number} opt_precision The desired precision.
 * @return {string} {@code num} as a string with the given options.
 */
goog.string.padNumber = function(num, length, opt_precision) {
  var s = goog.isDef(opt_precision) ? num.toFixed(opt_precision) : String(num);
  var index = s.indexOf('.');
  if (index == -1) {
    index = s.length;
  }
  return goog.string.repeat('0', Math.max(0, length - index)) + s;
};


/**
 * Returns a string representation of the given object, with
 * null and undefined being returned as the empty string.
 *
 * @param {(Object,null,undefined)} obj The object to convert.
 * @return {string} A string representation of the {@code obj}.
 */
goog.string.makeSafe = function(obj) {
  return obj == null ? '' : String(obj);
};


/**
 * Concatenates string expressions. This is useful
 * since some browsers are very inefficient when it comes to using plus to
 * concat strings. Be careful when using null and undefined here since
 * these will not be included in the result. If you need to represent these
 * be sure to cast the argument to a String first.
 * For example:
 * <pre>buildString('a', 'b', 'c', 'd') -> 'abcd'
 * buildString(null, undefined) -> ''
 * </pre>
 * @param {*} var_args A list of strings to concatenate. If not a string,
 *     it will be casted to one.
 * @return {string} The concatenation of {@code var_args}.
 */
goog.string.buildString = function(var_args) {
  return Array.prototype.join.call(arguments, '');
};


/**
 * Returns a string with at least 64-bits of randomness.
 *
 * Doesn't trust Javascript's random function entirely. Uses a combination of
 * random and current timestamp, and then encodes the string in base-36 to
 * make it shorter.
 *
 * @return {string} A random string, e.g. sn1s7vb4gcic.
 */
goog.string.getRandomString = function() {
  return Math.floor(Math.random() * 2147483648).toString(36) +
         (Math.floor(Math.random() * 2147483648) ^
          (new Date).getTime()).toString(36);
};


/**
 * Compares two version numbers.
 *
 * @param {string|number} version1 Version of first item.
 * @param {string|number} version2 Version of second item.
 *
 * @return {number}  1 if {@code version1} is higher.
 *                   0 if arguments are equal.
 *                  -1 if {@code version2} is higher.
 */
goog.string.compareVersions = function(version1, version2) {
  var order = 0;
  // Trim leading and trailing whitespace and split the versions into
  // subversions.
  var v1Subs = goog.string.trim(String(version1)).split('.');
  var v2Subs = goog.string.trim(String(version2)).split('.');
  var subCount = Math.max(v1Subs.length, v2Subs.length);

  // Iterate over the subversions, as long as they appear to be equivalent.
  for (var subIdx = 0; order == 0 && subIdx < subCount; subIdx++) {
    var v1Sub = v1Subs[subIdx] || '';
    var v2Sub = v2Subs[subIdx] || '';

    // Split the subversions into pairs of numbers and qualifiers (like 'b').
    // Two different RegExp objects are needed because they are both using
    // the 'g' flag.
    var v1CompParser = new RegExp('(\\d*)(\\D*)', 'g');
    var v2CompParser = new RegExp('(\\d*)(\\D*)', 'g');
    do {
      var v1Comp = v1CompParser.exec(v1Sub) || ['', '', ''];
      var v2Comp = v2CompParser.exec(v2Sub) || ['', '', ''];
      // Break if there are no more matches.
      if (v1Comp[0].length == 0 && v2Comp[0].length == 0) {
        break;
      }

      // Parse the numeric part of the subversion. A missing number is
      // equivalent to 0.
      var v1CompNum = v1Comp[1].length == 0 ? 0 : parseInt(v1Comp[1], 10);
      var v2CompNum = v2Comp[1].length == 0 ? 0 : parseInt(v2Comp[1], 10);

      // Compare the subversion components. The number has the highest
      // precedence. Next, if the numbers are equal, a subversion without any
      // qualifier is always higher than a subversion with any qualifier. Next,
      // the qualifiers are compared as strings.
      order = goog.string.compareElements_(v1CompNum, v2CompNum) ||
          goog.string.compareElements_(v1Comp[2].length == 0,
              v2Comp[2].length == 0) ||
          goog.string.compareElements_(v1Comp[2], v2Comp[2]);
    // Stop as soon as an inequality is discovered.
    } while (order == 0);
  }

  return order;
};


/**
 * Compares elements of a version number.
 *
 * @param {string|number|boolean} left An element from a version number.
 * @param {string|number|boolean} right An element from a version number.
 *
 * @return {number}  1 if {@code left} is higher.
 *                   0 if arguments are equal.
 *                  -1 if {@code right} is higher.
 * @private
 */
goog.string.compareElements_ = function(left, right) {
  if (left < right) {
    return -1;
  } else if (left > right) {
    return 1;
  }
  return 0;
};


/**
 * Maximum value of #goog.string.hashCode, exclusive. 2^32.
 * @type {number}
 * @private
 */
goog.string.HASHCODE_MAX_ = 0x100000000;


/**
 * String hash function similar to java.lang.String.hashCode().
 * The hash code for a string is computed as
 * s[0] * 31 ^ (n - 1) + s[1] * 31 ^ (n - 2) + ... + s[n - 1],
 * where s[i] is the ith character of the string and n is the length of
 * the string. We mod the result to make it between 0 (inclusive) and 2^32
 * (exclusive).
 * @param {string} str A string.
 * @return {number} Hash value for {@code str}, between 0 (inclusive) and 2^32
 *  (exclusive). The empty string returns 0.
 */
goog.string.hashCode = function(str) {
  var result = 0;
  for (var i = 0; i < str.length; ++i) {
    result = 31 * result + str.charCodeAt(i);
    // Normalize to 4 byte range, 0 ... 2^32.
    result %= goog.string.HASHCODE_MAX_;
  }
  return result;
};


/**
 * The most recent globally unique ID.
 * @type {number}
 * @private
 */
goog.string.uniqueStringCounter_ = goog.now();


/**
 * Generates and returns a unique string based on the current date so strings
 * remain unique between sessions.  This is useful, for example, to create
 * unique IDs for DOM elements.
 * @return {string} A unique id.
 */
goog.string.createUniqueString = function() {
  return 'goog_' + goog.string.uniqueStringCounter_++;
};


/**
 * Converts the supplied string to a number, which may be Ininity or NaN.
 * This function strips whitespace: (toNumber(' 123') === 123)
 * This function accepts scientific notation: (toNumber('1e1') === 10)
 *
 * This is better than Javascript's built-in conversions because, sadly:
 *     (Number(' ') === 0) and (parseFloat('123a') === 123)
 *
 * @param {string} str The string to convert.
 * @return {number} The number the supplied string represents, or NaN.
 */
goog.string.toNumber = function(str) {
  var num = Number(str);
  if (num == 0 && goog.string.isEmpty(str)) {
    return NaN;
  }
  return num;
};

// Copyright 2006 Google Inc.
// All Rights Reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 
//  * Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
//  * Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in
//    the documentation and/or other materials provided with the
//    distribution.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
// INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
// BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
// LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
// ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE. 

/**
 * @fileoverview Rendering engine detection.
 * @see <a href="http://www.useragentstring.com/">User agent strings</a>
 * For information on the browser brand (such as Safari versus Chrome), see
 * goog.userAgent.product.
 */

goog.provide('goog.userAgent');

goog.require('goog.string');


/**
 * @define {boolean} Whether we know at compile-time that the browser is IE.
 */
goog.userAgent.ASSUME_IE = false;


/**
 * @define {boolean} Whether we know at compile-time that the browser is GECKO.
 */
goog.userAgent.ASSUME_GECKO = false;


/**
 * @define {boolean} Whether we know at compile-time that the browser is CAMINO.
 * @deprecated Use goog.userAgent.product.ASSUME_CAMINO instead.
 */
goog.userAgent.ASSUME_CAMINO = false;


/**
 * @define {boolean} Whether we know at compile-time that the browser is WEBKIT.
 */
goog.userAgent.ASSUME_WEBKIT = false;


/**
 * @define {boolean} Whether we know at compile-time that the browser is a
 *     mobile device running WebKit e.g. iPhone or Android.
 */
goog.userAgent.ASSUME_MOBILE_WEBKIT = false;


/**
 * @define {boolean} Whether we know at compile-time that the browser is OPERA.
 */
goog.userAgent.ASSUME_OPERA = false;


/**
 * Whether we know the browser engine at compile-time.
 * @type {boolean}
 * @private
 */
goog.userAgent.BROWSER_KNOWN_ =
    goog.userAgent.ASSUME_IE ||
    goog.userAgent.ASSUME_GECKO ||
    goog.userAgent.ASSUME_CAMINO ||
    goog.userAgent.ASSUME_MOBILE_WEBKIT ||
    goog.userAgent.ASSUME_WEBKIT ||
    goog.userAgent.ASSUME_OPERA;


/**
 * Returns the userAgent string for the current browser.
 * Some user agents (I'm thinking of you, Gears WorkerPool) do not expose a
 * navigator object off the global scope.  In that case we return null.
 *
 * @return {string?} The userAgent string or null if there is none.
 */
goog.userAgent.getUserAgentString = function() {
  return goog.global['navigator'] ? goog.global['navigator'].userAgent : null;
};


/**
 * @return {Object} The native navigator object.
 */
goog.userAgent.getNavigator = function() {
  // Need a local navigator reference instead of using the global one,
  // to avoid the rare case where they reference different objects.
  // (goog.gears.FakeWorkerPool, for example).
  return goog.global['navigator'];
};


/**
 * Initializer for goog.userAgent.
 *
 * This is a named function so that it can be stripped via the jscompiler
 * option for stripping types.
 * @private
 */
goog.userAgent.init_ = function() {
  /**
   * Whether the user agent string denotes Opera.
   * @type {boolean}
   * @private
   */
  goog.userAgent.detectedOpera_ = false;

  /**
   * Whether the user agent string denotes Internet Explorer. This includes
   * other browsers using Trident as its rendering engine. For example AOL
   * and Netscape 8
   * @type {boolean}
   * @private
   */
  goog.userAgent.detectedIe_ = false;

  /**
   * Whether the user agent string denotes WebKit. WebKit is the rendering
   * engine that Safari, Android and others use.
   * @type {boolean}
   * @private
   */
  goog.userAgent.detectedWebkit_ = false;

  /**
   * Whether the user agent string denotes a mobile device.
   * @type {boolean}
   * @private
   */
  goog.userAgent.detectedMobile_ = false;

  /**
   * Whether the user agent string denotes Gecko. Gecko is the rendering
   * engine used by Mozilla, Mozilla Firefox, Camino and many more.
   * @type {boolean}
   * @private
   */
  goog.userAgent.detectedGecko_ = false;

  /**
   * Whether the user agent is Camino.
   * @type {boolean}
   */
  goog.userAgent.detectedCamino_ = false;

  var ua;
  if (!goog.userAgent.BROWSER_KNOWN_ &&
      (ua = goog.userAgent.getUserAgentString())) {
    var navigator = goog.userAgent.getNavigator();
    goog.userAgent.detectedOpera_ = ua.indexOf('Opera') == 0;
    goog.userAgent.detectedIe_ = !goog.userAgent.detectedOpera_ &&
        ua.indexOf('MSIE') != -1;
    goog.userAgent.detectedWebkit_ = !goog.userAgent.detectedOpera_ &&
        ua.indexOf('WebKit') != -1;
    // WebKit also gives navigator.product string equal to 'Gecko'.
    goog.userAgent.detectedMobile_ = goog.userAgent.detectedWebkit_ &&
        ua.indexOf('Mobile') != -1;
    goog.userAgent.detectedGecko_ = !goog.userAgent.detectedOpera_ &&
        !goog.userAgent.detectedWebkit_ && navigator.product == 'Gecko';
    goog.userAgent.detectedCamino_ = goog.userAgent.detectedGecko_ &&
        navigator.vendor == 'Camino';
  }
};


if (!goog.userAgent.BROWSER_KNOWN_) {
  goog.userAgent.init_();
}


/**
 * Whether the user agent is Opera.
 * @type {boolean}
 */
goog.userAgent.OPERA = goog.userAgent.BROWSER_KNOWN_ ?
    goog.userAgent.ASSUME_OPERA : goog.userAgent.detectedOpera_;


/**
 * Whether the user agent is Internet Explorer. This includes other browsers
 * using Trident as its rendering engine. For example AOL and Netscape 8
 * @type {boolean}
 */
goog.userAgent.IE = goog.userAgent.BROWSER_KNOWN_ ?
    goog.userAgent.ASSUME_IE : goog.userAgent.detectedIe_;


/**
 * Whether the user agent is Gecko. Gecko is the rendering engine used by
 * Mozilla, Mozilla Firefox, Camino and many more.
 * @type {boolean}
 */
goog.userAgent.GECKO = goog.userAgent.BROWSER_KNOWN_ ?
    goog.userAgent.ASSUME_GECKO || goog.userAgent.ASSUME_CAMINO :
    goog.userAgent.detectedGecko_;


/**
 * Whether the user agent is Camino.
 * @type {boolean}
 * @deprecated Use {@link goog.userAgent.product.CAMINO} instead.
 */
goog.userAgent.CAMINO = goog.userAgent.BROWSER_KNOWN_ ?
    goog.userAgent.ASSUME_CAMINO : goog.userAgent.detectedCamino_;


/**
 * Whether the user agent is WebKit. WebKit is the rendering engine that
 * Safari, Android and others use.
 * @type {boolean}
 */
goog.userAgent.WEBKIT = goog.userAgent.BROWSER_KNOWN_ ?
    goog.userAgent.ASSUME_WEBKIT || goog.userAgent.ASSUME_MOBILE_WEBKIT :
    goog.userAgent.detectedWebkit_;


/**
 * Whether the user agent is running on a mobile device.
 * @type {boolean}
 */
goog.userAgent.MOBILE = goog.userAgent.ASSUME_MOBILE_WEBKIT ||
                        goog.userAgent.detectedMobile_;


/**
 * Used while transitioning code to use WEBKIT instead.
 * @type {boolean}
 * @deprecated Use {@link goog.userAgent.product.SAFARI} instead.
 */
goog.userAgent.SAFARI = goog.userAgent.WEBKIT;


/**
 * @return {string} the platform (operating system) the user agent is running
 *     on. Default to empty string because navigator.platform may not be defined
 *     (on Rhino, for example).
 * @private
 */
goog.userAgent.determinePlatform_ = function() {
  var navigator = goog.userAgent.getNavigator();
  return navigator && navigator.platform || '';
};


/**
 * The platform (operating system) the user agent is running on. Default to
 * empty string because navigator.platform may not be defined (on Rhino, for
 * example).
 * @type {string}
 */
goog.userAgent.PLATFORM = goog.userAgent.determinePlatform_();


/**
 * @define {boolean} Whether the user agent is running on a Macintosh operating
 *     system.
 */
goog.userAgent.ASSUME_MAC = false;


/**
 * @define {boolean} Whether the user agent is running on a Windows operating
 *     system.
 */
goog.userAgent.ASSUME_WINDOWS = false;


/**
 * @define {boolean} Whether the user agent is running on a Linux operating
 *     system.
 */
goog.userAgent.ASSUME_LINUX = false;


/**
 * @type {boolean}
 * @private
 */
goog.userAgent.PLATFORM_KNOWN_ =
    goog.userAgent.ASSUME_MAC ||
    goog.userAgent.ASSUME_WINDOWS ||
    goog.userAgent.ASSUME_LINUX;


/**
 * Initialize the goog.userAgent constants that define which platform the user
 * agent is running on.
 * @private
 */
goog.userAgent.initPlatform_ = function() {
  /**
   * Whether the user agent is running on a Macintosh operating system.
   * @type {boolean}
   */
  goog.userAgent.detectedMac_ = goog.string.contains(goog.userAgent.PLATFORM,
      'Mac');

  /**
   * Whether the user agent is running on a Windows operating system.
   * @type {boolean}
   */
  goog.userAgent.detectedWindows_ = goog.string.contains(
      goog.userAgent.PLATFORM, 'Win');

  /**
   * Whether the user agent is running on a Linux operating system.
   * @type {boolean}
   */
  goog.userAgent.detectedLinux_ = goog.string.contains(goog.userAgent.PLATFORM,
      'Linux');
};


if (!goog.userAgent.PLATFORM_KNOWN_) {
  goog.userAgent.initPlatform_();
}


/**
 * Whether the user agent is running on a Macintosh operating system.
 * @type {boolean}
 */
goog.userAgent.MAC = goog.userAgent.PLATFORM_KNOWN_ ?
    goog.userAgent.ASSUME_MAC : goog.userAgent.detectedMac_;


/**
 * Whether the user agent is running on a Windows operating system.
 * @type {boolean}
 */
goog.userAgent.WINDOWS = goog.userAgent.PLATFORM_KNOWN_ ?
    goog.userAgent.ASSUME_WINDOWS : goog.userAgent.detectedWindows_;


/**
 * Whether the user agent is running on a Linux operating system.
 * @type {boolean}
 */
goog.userAgent.LINUX = goog.userAgent.PLATFORM_KNOWN_ ?
    goog.userAgent.ASSUME_LINUX : goog.userAgent.detectedLinux_;


/**
 * @return {string} The string that describes the version number of the user
 *     agent.
 * @private
 */
goog.userAgent.determineVersion_ = function() {
  // All browsers have different ways to detect the version and they all have
  // different naming schemes.

  // version is a string rather than a number because it may contain 'b', 'a',
  // and so on.
  var version = '', re;

  // goog.userAgent.X and goog.userAgent.DETECTED_X_ are both checked so this
  // code can be tested in useragent_test.html but also be compiled efficiently
  // as verified in CompileUserAgentTest.java.
  if (goog.userAgent.OPERA && goog.global['opera']) {
    var operaVersion = goog.global['opera'].version;
    version = typeof operaVersion == 'function' ? operaVersion() : operaVersion;
  } else {
    if (goog.userAgent.GECKO) {
      re = /rv\:([^\);]+)(\)|;)/;
    } else if (goog.userAgent.IE) {
      re = /MSIE\s+([^\);]+)(\)|;)/;
    } else if (goog.userAgent.WEBKIT) {
      // WebKit/125.4
      re = /WebKit\/(\S+)/;
    }
    if (re) {
      var arr = re.exec(goog.userAgent.getUserAgentString());
      version = arr ? arr[1] : '';
    }
  }
  return version;
};


/**
 * The version of the user agent. This is a string because it might contain
 * 'b' (as in beta) as well as multiple dots.
 * @type {string}
 */
goog.userAgent.VERSION = goog.userAgent.determineVersion_();


/**
 * Compares two version numbers.
 *
 * @param {string} v1 Version of first item.
 * @param {string} v2 Version of second item.
 *
 * @return {Number}  1 if first argument is higher
 *                   0 if arguments are equal
 *                  -1 if second argument is higher.
 * @deprecated Use goog.string.compareVersions.
 */
goog.userAgent.compare = function(v1, v2) {
  return goog.string.compareVersions(v1, v2);
};


/**
 * Cache for {@link goog.userAgent.isVersion}. Calls to compareVersions are
 * surprisingly expensive and as a browsers version number is unlikely to change
 * during a session we cache the results.
 * @type {Object}
 * @private
 */
goog.userAgent.isVersionCache_ = {};


/**
 * Whether the user agent version is higher or the same as the given version.
 * NOTE: When checking the version numbers for Firefox and Safari, be sure to
 * use the engine's version, not the browser's version number.  For example,
 * Firefox 3.0 corresponds to Gecko 1.9 and Safari 3.0 to Webkit 522.11.
 * Opera and Internet Explorer versions match the product release number.<br>
 * @see <a href="http://en.wikipedia.org/wiki/Safari_(web_browser)">Webkit</a>
 * @see <a href="http://en.wikipedia.org/wiki/Gecko_engine">Gecko</a>
 *
 * @param {string} version The version to check.
 * @return {boolean} Whether the user agent version is higher or the same as
 *     the given version.
 */
goog.userAgent.isVersion = function(version) {
  return goog.userAgent.isVersionCache_[version] ||
      (goog.userAgent.isVersionCache_[version] =
          goog.string.compareVersions(goog.userAgent.VERSION, version) >= 0);
};

// Copyright 2008 Google Inc. All Rights Reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 
//  * Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
//  * Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in
//    the documentation and/or other materials provided with the
//    distribution.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
// INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
// BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
// LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
// ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE. 

/**
 * @fileoverview Detects the specific browser and not just the rendering engine.
 *
 */

goog.provide('goog.userAgent.product');

goog.require('goog.userAgent');


/**
 * @define {boolean} Whether the code is running on the Firefox web browser.
 */
goog.userAgent.product.ASSUME_FIREFOX = false;


/**
 * @define {boolean} Whether the code is running on the Camino web browser.
 */
goog.userAgent.product.ASSUME_CAMINO = false;


/**
 * @define {boolean} Whether we know at compile-time that the product is an
 *     iPhone.
 */
goog.userAgent.product.ASSUME_IPHONE = false;


/**
 * @define {boolean} Whether we know at compile-time that the product is an
 *     Android phone.
 */
goog.userAgent.product.ASSUME_ANDROID = false;


/**
 * @define {boolean} Whether the code is running on the Chrome web browser.
 */
goog.userAgent.product.ASSUME_CHROME = false;


/**
 * @define {boolean} Whether the code is running on the Safari web browser.
 */
goog.userAgent.product.ASSUME_SAFARI = false;


/**
 * Whether we know the product type at compile-time.
 * @type {boolean}
 * @private
 */
goog.userAgent.product.PRODUCT_KNOWN_ =
    goog.userAgent.ASSUME_IE ||
    goog.userAgent.ASSUME_OPERA ||
    goog.userAgent.product.ASSUME_FIREFOX ||
    goog.userAgent.product.ASSUME_CAMINO ||
    goog.userAgent.product.ASSUME_IPHONE ||
    goog.userAgent.product.ASSUME_ANDROID ||
    goog.userAgent.product.ASSUME_CHROME ||
    goog.userAgent.product.ASSUME_SAFARI;


/**
 * Right now we just focus on Tier 1-3 browsers at:
 * http://wiki.corp.google.com/twiki/bin/view/Nonconf/ProductPlatformGuidelines
 * As well as the YUI grade A browsers at:
 * http://developer.yahoo.com/yui/articles/gbs/
 *
 * @private
 */
goog.userAgent.product.init_ = function() {

  /**
   * Whether the code is running on the Firefox web browser.
   * @type {boolean}
   * @private
   */
  goog.userAgent.product.detectedFirefox_ = false;

  /**
   * Whether the code is running on the Camino web browser.
   * @type {boolean}
   * @private
   */
  goog.userAgent.product.detectedCamino_ = false;

  /**
   * Whether the code is running on an iPhone or iPod touch.
   * @type {boolean}
   * @private
   */
  goog.userAgent.product.detectedIphone_ = false;

  /**
   * Whether the code is running on the default browser on an Android phone.
   * @type {boolean}
   * @private
   */
  goog.userAgent.product.detectedAndroid_ = false;

  /**
   * Whether the code is running on the Chrome web browser.
   * @type {boolean}
   * @private
   */
  goog.userAgent.product.detectedChrome_ = false;

  /**
   * Whether the code is running on the Safari web browser.
   * @type {boolean}
   * @private
   */
  goog.userAgent.product.detectedSafari_ = false;

  var ua = goog.userAgent.getUserAgentString();
  if (!ua) {
    return;
  }

  // The order of the if-statements in the following code is important.
  // For example, in the WebKit section, we put Chrome in front of Safari
  // because the string 'Safari' is present on both of those browsers'
  // userAgent strings as well as the string we are looking for.
  // The idea is to prevent accidental detection of more than one client.

  if (ua.indexOf('Firefox') != -1) {
    goog.userAgent.product.detectedFirefox_ = true;
  } else if (ua.indexOf('Camino') != -1) {
    goog.userAgent.product.detectedCamino_ = true;
  } else if (ua.indexOf('iPhone') != -1 || ua.indexOf('iPod') != -1) {
    goog.userAgent.product.detectedIphone_ = true;
  } else if (ua.indexOf('Android') != -1) {
    goog.userAgent.product.detectedAndroid_ = true;
  } else if (ua.indexOf('Chrome') != -1) {
    goog.userAgent.product.detectedChrome_ = true;
  } else if (ua.indexOf('Safari') != -1) {
    goog.userAgent.product.detectedSafari_ = true;
  }
};

if (!goog.userAgent.product.PRODUCT_KNOWN_) {
  goog.userAgent.product.init_();
}


/**
 * Whether the code is running on the Opera web browser.
 * @type {boolean}
 */
goog.userAgent.product.OPERA = goog.userAgent.OPERA;


/**
 * Whether the code is running on an IE web browser.
 * @type {boolean}
 */
goog.userAgent.product.IE = goog.userAgent.IE;


/**
 * Whether the code is running on the Firefox web browser.
 * @type {boolean}
 */
goog.userAgent.product.FIREFOX = goog.userAgent.product.PRODUCT_KNOWN_ ?
    goog.userAgent.product.ASSUME_FIREFOX :
    goog.userAgent.product.detectedFirefox_;


/**
 * Whether the code is running on the Camino web browser.
 * @type {boolean}
 */
goog.userAgent.product.CAMINO = goog.userAgent.product.PRODUCT_KNOWN_ ?
    goog.userAgent.product.ASSUME_CAMINO :
    goog.userAgent.product.detectedCamino_;


/**
 * Whether the code is running on an iPhone or iPod touch.
 * @type {boolean}
 */
goog.userAgent.product.IPHONE = goog.userAgent.product.PRODUCT_KNOWN_ ?
    goog.userAgent.product.ASSUME_IPHONE :
    goog.userAgent.product.detectedIphone_;


/**
 * Whether the code is running on the default browser on an Android phone.
 * @type {boolean}
 */
goog.userAgent.product.ANDROID = goog.userAgent.product.PRODUCT_KNOWN_ ?
    goog.userAgent.product.ASSUME_ANDROID :
    goog.userAgent.product.detectedAndroid_;


/**
 * Whether the code is running on the Chrome web browser.
 * @type {boolean}
 */
goog.userAgent.product.CHROME = goog.userAgent.product.PRODUCT_KNOWN_ ?
    goog.userAgent.product.ASSUME_CHROME :
    goog.userAgent.product.detectedChrome_;


/**
 * Whether the code is running on the Safari web browser.
 * @type {boolean}
 */
goog.userAgent.product.SAFARI = goog.userAgent.product.PRODUCT_KNOWN_ ?
    goog.userAgent.product.ASSUME_SAFARI :
    goog.userAgent.product.detectedSafari_;

// Copyright 2006 Google Inc.
// All Rights Reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 
//  * Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
//  * Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in
//    the documentation and/or other materials provided with the
//    distribution.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
// INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
// BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
// LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
// ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE. 

/**
 * @fileoverview Utilities for working with selections in input boxes and text
 * areas.
 *
 */


goog.provide('goog.dom.selection');


goog.require('goog.string');
goog.require('goog.userAgent');


/**
 * Sets the place where the selection should start inside a textarea or a text
 * input
 * @param {Element} textfield A textarea or text input.
 * @param {number} pos The position to set the start of the selection at.
 */
goog.dom.selection.setStart = function(textfield, pos) {
  if (goog.dom.selection.useSelectionProperties_(textfield)) {
    textfield.selectionStart = pos;
  } else if (goog.userAgent.IE) {
    // destructuring assignment would have been sweet
    var tmp = goog.dom.selection.getRangeIe_(textfield);
    var range = tmp[0];
    var selectionRange = tmp[1];

    if (range.inRange(selectionRange)) {
      if (textfield.type == 'textarea') {
        // For IE \r\n is 2 characters but move('character', n) passes both
        // in one move itself. We do this only for textarea because it is the
        // only one which can have a \r\n (input cannot have this).
        var value = textfield.value.substring(0, pos);
        pos = goog.string.canonicalizeNewlines(value).length;
      }

      range.collapse(true);
      range.move('character', pos);
      range.select();
    }
  }
};


/**
 * Return the place where the selection starts inside a textarea or a text
 * input
 * @param {Element} textfield A textarea or text input.
 * @return {number} The position where the selection starts or 0 if it was
 *     unable to find the position or no selection exists. Note that we can't
 *     reliably tell the difference between an element that has no selection and
 *     one where it starts at 0.
 */
goog.dom.selection.getStart = function(textfield) {
  return goog.dom.selection.getEndPoints_(textfield, true)[0];
};


/**
 * Returns the start and end points of the selection within a textarea in IE.
 * IE treats newline characters as \r\n characters, and we need to check for
 * these characters at the edge of our selection, to ensure that we return the
 * right cursor position.
 * @param {Range} range Complete range object, e.g., "Hello\r\n".
 * @param {Range} selRange Selected range object.
 * @param {boolean} getOnlyStart Value indicating if only start
 *     cursor position is to be returned. In IE, obtaining the end position
 *     involves extra work, hence we have this parameter for calls which need
 *     only start position.
 * @return {Array.<number>} An array with the start and end positions where the
 *     selection starts and ends or [0,0] if it was unable to find the
 *     positions or no selection exists. Note that we can't reliably tell the
 *     difference between an element that has no selection and one where
 *     it starts and ends at 0. If getOnlyStart was true, we return
 *     -1 as end offset.
 * @private
 */
goog.dom.selection.getEndPointsTextareaIe_ = function(
    range, selRange, getOnlyStart) {
  // Create a duplicate of the selected range object to perform our actions
  // against. Example of selectionRange = "" (assuming that the cursor is
  // just after the \r\n combination)
  var selectionRange = selRange.duplicate();

  // Text before the selection start, e.g.,"Hello" (notice how range.text
  // excludes the \r\n sequence)
  var beforeSelectionText = range.text;
  // Text before the selection start, e.g., "Hello" (this will later include
  // the \r\n sequences also)
  var untrimmedBeforeSelectionText = beforeSelectionText;
  // Text within the selection , e.g. "" assuming that the cursor is just after
  // the \r\n combination.
  var selectionText = selectionRange.text;
  // Text within the selection, e.g.,  "" (this will later include the \r\n
  // sequences also)
  var untrimmedSelectionText = selectionText;

  // Boolean indicating whether we are done dealing with the text before the
  // selection's beginning.
  var isRangeEndTrimmed = false;
  // Go over the range until it becomes a 0-lengthed range or until the range
  // text starts changing when we move the end back by one character.
  // If after moving the end back by one character, the text remains the same,
  // then we need to add a "\r\n" at the end to get the actual text.
  while (!isRangeEndTrimmed) {
    if (range.compareEndPoints('StartToEnd', range) == 0) {
      isRangeEndTrimmed = true;
    } else {
      range.moveEnd('character', -1);
      if (range.text == beforeSelectionText) {
        // If the start position of the cursor was after a \r\n string,
        // we would skip over it in one go with the moveEnd call, but
        // range.text will still show "Hello" (because of the IE range.text
        // bug) - this implies that we should add a \r\n to our
        // untrimmedBeforeSelectionText string.
        untrimmedBeforeSelectionText += '\r\n';
      } else {
        isRangeEndTrimmed = true;
      }
    }
  }

  if (getOnlyStart) {
    // We return -1 as end, since the caller is only interested in the start
    // value.
    return [untrimmedBeforeSelectionText.length, -1];
  }
  // Boolean indicating whether we are done dealing with the text inside the
  // selection.
  var isSelectionRangeEndTrimmed = false;
  // Go over the selected range until it becomes a 0-lengthed range or until
  // the range text starts changing when we move the end back by one character.
  // If after moving the end back by one character, the text remains the same,
  // then we need to add a "\r\n" at the end to get the actual text.
  while (!isSelectionRangeEndTrimmed) {
    if (selectionRange.compareEndPoints('StartToEnd', selectionRange) == 0) {
      isSelectionRangeEndTrimmed = true;
    } else {
      selectionRange.moveEnd('character', -1);
      if (selectionRange.text == selectionText) {
        // If the selection was not empty, and the end point of the selection
        // was just after a \r\n, we would have skipped it in one go with the
        // moveEnd call, and this implies that we should add a \r\n to the
        // untrimmedSelectionText string.
        untrimmedSelectionText += '\r\n';
      } else {
        isSelectionRangeEndTrimmed = true;
      }
    }
  }
  return [untrimmedBeforeSelectionText.length,
          untrimmedBeforeSelectionText.length + untrimmedSelectionText.length];
};


/**
 * Returns the start and end points of the selection inside a textarea or a
 * text input.
 * @param {Element} textfield A textarea or text input.
 * @return {Array.<number>} An array with the start and end positions where the
 *     selection starts and ends or [0,0] if it was unable to find the
 *     positions or no selection exists. Note that we can't reliably tell the
 *     difference between an element that has no selection and one where
 *     it starts and ends at 0.
 */
goog.dom.selection.getEndPoints = function(textfield) {
  return goog.dom.selection.getEndPoints_(textfield, false);
};


/**
 * Returns the start and end points of the selection inside a textarea or a
 * text input.
 * @param {Element} textfield A textarea or text input.
 * @param {boolean} getOnlyStart Value indicating if only start
 *     cursor position is to be returned. In IE, obtaining the end position
 *     involves extra work, hence we have this parameter. In FF, there is not
 *     much extra effort involved.
 * @return {Array.<number>} An array with the start and end positions where the
 *     selection starts and ends or [0,0] if it was unable to find the
 *     positions or no selection exists. Note that we can't reliably tell the
 *     difference between an element that has no selection and one where
 *     it starts and ends at 0. If getOnlyStart was true, we return
 *     -1 as end offset.
 * @private
 */
goog.dom.selection.getEndPoints_ = function(textfield, getOnlyStart) {
  var startPos = 0;
  var endPos = 0;
  if (goog.dom.selection.useSelectionProperties_(textfield)) {
    startPos = textfield.selectionStart;
    endPos = getOnlyStart ? -1 : textfield.selectionEnd;
  } else if (goog.userAgent.IE) {
    var tmp = goog.dom.selection.getRangeIe_(textfield);
    var range = tmp[0];
    var selectionRange = tmp[1];

    if (range.inRange(selectionRange)) {
      range.setEndPoint('EndToStart', selectionRange);
      if (textfield.type == 'textarea') {
        return goog.dom.selection.getEndPointsTextareaIe_(
            range, selectionRange, getOnlyStart);
      }
      startPos = range.text.length;
      if (!getOnlyStart) {
        endPos = range.text.length + selectionRange.text.length;
      } else {
        endPos = -1;  // caller did not ask for end position
      }
    }
  }
  return [startPos, endPos];
};


/**
 * Sets the place where the selection should end inside a text area or a text
 * input
 * @param {Element} textfield A textarea or text input.
 * @param {number} pos The position to end the selection at.
 */
goog.dom.selection.setEnd = function(textfield, pos) {
  if (goog.dom.selection.useSelectionProperties_(textfield)) {
    textfield.selectionEnd = pos;
  } else if (goog.userAgent.IE) {
    var tmp = goog.dom.selection.getRangeIe_(textfield);
    var range = tmp[0];
    var selectionRange = tmp[1];

    if (range.inRange(selectionRange)) {
      var startCursorPos = goog.dom.selection.getStart(textfield);
      if (textfield.type == 'textarea') {
        // For IE \r\n is 2 characters but move('character', n) passes both
        // in one move itself. We do this only for textarea because it is the
        // only one which can have a \r\n (input cannot have this).
        var value = textfield.value.substring(0, pos);
        pos = goog.string.canonicalizeNewlines(value).length;
        // startCursorPos has the length of the text before the start position
        // inclusive of the \r\n values (because it uses the getStart routine)
        // To calculate the right offset for the end position, we need to
        // canonicalize this text and take its length.
        var startSubstring = textfield.value.substring(0, startCursorPos);
        startCursorPos =
            goog.string.canonicalizeNewlines(startSubstring).length;
      }
      selectionRange.collapse(true);
      selectionRange.moveEnd('character', pos - startCursorPos);

      selectionRange.select();
    }
  }
};


/**
 * Returns the place where the selection ends inside a textarea or a text input
 * @param {Element} textfield A textarea or text input.
 * @return {number} The position where the selection ends or 0 if it was
 *     unable to find the position or no selection exists.
 */
goog.dom.selection.getEnd = function(textfield) {
 return goog.dom.selection.getEndPoints_(textfield, false)[1];
};


/**
 * Sets the cursor position within a textfield.
 * @param {Element} textfield A textarea or text input.
 * @param {number} pos The position within the text field.
 */
goog.dom.selection.setCursorPosition = function(textfield, pos) {
  // getOwnerDocument(): Remove dependency on goog.dom's main namespace b
  var doc = textfield.ownerDocument || textfield.document;

  if (goog.dom.selection.useSelectionProperties_(textfield)) {
    // Mozilla directly supports this
    textfield.selectionStart = pos;
    textfield.selectionEnd = pos;

  } else if (doc.selection && textfield.createTextRange) {
    // IE has textranges. A textfield's textrange encompasses the
    // entire textfield's text by default
    var sel = textfield.createTextRange();

    sel.collapse(true);
    sel.move('character', pos);
    sel.select();
  }
};


/**
 * Sets the selected text inside a textarea or a text input
 * @param {Element} textfield A textarea or text input.
 * @param {string} text The text to change the selection to.
 */
goog.dom.selection.setText = function(textfield, text) {
  if (goog.dom.selection.useSelectionProperties_(textfield)) {
    var value = textfield.value;
    var oldSelectionStart = textfield.selectionStart;
    var before = value.substr(0, oldSelectionStart);
    var after = value.substr(textfield.selectionEnd);
    textfield.value = before + text + after;
    textfield.selectionStart = oldSelectionStart;
    textfield.selectionEnd = oldSelectionStart + text.length;
  } else if (goog.userAgent.IE) {
    var tmp = goog.dom.selection.getRangeIe_(textfield);
    var range = tmp[0];
    var selectionRange = tmp[1];

    if (!range.inRange(selectionRange)) {
      return;
    }
    // When we set the selection text the selection range is collapsed to the
    // end. We therefore duplicate the current selection so we know where it
    // started. Once we've set the selection text we move the start of the
    // selection range to the old start
    var range2 = selectionRange.duplicate();
    selectionRange.text = text;
    selectionRange.setEndPoint('StartToStart', range2);
    selectionRange.select();
  } else {
    throw Error('Cannot set the selection end');
  }
};


/**
 * Returns the selected text inside a textarea or a text input
 * @param {Element} textfield A textarea or text input.
 * @return {string} The selected text.
 */
goog.dom.selection.getText = function(textfield) {
  if (goog.dom.selection.useSelectionProperties_(textfield)) {
    var s = textfield.value;
    return s.substring(textfield.selectionStart, textfield.selectionEnd);
  }

  if (goog.userAgent.IE) {
    var tmp = goog.dom.selection.getRangeIe_(textfield);
    var range = tmp[0];
    var selectionRange = tmp[1];

    if (!range.inRange(selectionRange)) {
      return '';
    } else if (textfield.type == 'textarea') {
      return goog.dom.selection.getSelectionRangeText_(selectionRange);
    }
    return selectionRange.text;
  }

  throw Error('Cannot get the selection text');
};

/**
 * Returns the selected text within a textarea in IE.
 * IE treats newline characters as \r\n characters, and we need to check for
 * these characters at the edge of our selection, to ensure that we return the
 * right string.
 * @param {Range} selRange Selected range object.
 * @return {string} Selected text in the textarea.
 * @private
 */
goog.dom.selection.getSelectionRangeText_ = function(selRange) {
  // Create a duplicate of the selected range object to perform our actions
  // against. Suppose the text in the textarea is "Hello\r\nWorld" and the
  // selection encompasses the "o\r\n" bit, initial selectionRange will be "o"
  // (assuming that the cursor is just after the \r\n combination)
  var selectionRange = selRange.duplicate();

  // Text within the selection , e.g. "o" assuming that the cursor is just after
  // the \r\n combination.
  var selectionText = selectionRange.text;
  // Text within the selection, e.g.,  "o" (this will later include the \r\n
  // sequences also)
  var untrimmedSelectionText = selectionText;

  // Boolean indicating whether we are done dealing with the text inside the
  // selection.
  var isSelectionRangeEndTrimmed = false;
  // Go over the selected range until it becomes a 0-lengthed range or until
  // the range text starts changing when we move the end back by one character.
  // If after moving the end back by one character, the text remains the same,
  // then we need to add a "\r\n" at the end to get the actual text.
  while (!isSelectionRangeEndTrimmed) {
    if (selectionRange.compareEndPoints('StartToEnd', selectionRange) == 0) {
      isSelectionRangeEndTrimmed = true;
    } else {
      selectionRange.moveEnd('character', -1);
      if (selectionRange.text == selectionText) {
        // If the selection was not empty, and the end point of the selection
        // was just after a \r\n, we would have skipped it in one go with the
        // moveEnd call, and this implies that we should add a \r\n to the
        // untrimmedSelectionText string.
        untrimmedSelectionText += '\r\n';
      } else {
        isSelectionRangeEndTrimmed = true;
      }
    }
  }
  return untrimmedSelectionText;
};

/**
 * Helper function for returning the range for an object as well as the
 * selection range
 * @private
 * @param {Element} el The element to get the range for.
 * @return {Array.<Range>} Range of object and selection range in two element
 *     array.
 */
goog.dom.selection.getRangeIe_ = function(el) {
  // getOwnerDocument(): Remove dependency on goog.dom's main namespace b
  var doc = el.ownerDocument || el.document;

  var selectionRange = doc.selection.createRange();
  // el.createTextRange() doesn't work on textareas
  var range;

  if (el.type == 'textarea') {
    range = doc.body.createTextRange();
    range.moveToElementText(el);
  } else {
    range = el.createTextRange();
  }

  return [range, selectionRange];
};


/**
 * Helper function to determine whether it's okay to use
 * selectionStart/selectionEnd.
 *
 * @param {Element} el The element to check for.
 * @return {boolean} Wether it's okay to use the selectionStart and
 *     selectionEnd properties on {@code el}.
 * @private
 */
goog.dom.selection.useSelectionProperties_ = function(el) {
  try {
    return typeof el.selectionStart == 'number';
  } catch (e) {
    // Firefox throws an exception if you try to access selectionStart
    // on an element with display: none.
    return false;
  }
};

// Copyright 2005 Google Inc.
// All Rights Reserved
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 
//  * Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
//  * Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in
//    the documentation and/or other materials provided with the
//    distribution.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
// INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
// BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
// LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
// ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE. 

/**
 * @fileoverview A patched, standardized event object for browser events.
 *
 * <pre>
 * The patched event object contains the following members:
 * - type           {String}    Event type, e.g. 'click'
 * - timestamp      {Date}      A date object for when the event was fired
 * - target         {Object}    The element that actually triggered the event
 * - currentTarget  {Object}    The element the listener is attached to
 * - relatedTarget  {Object}    For mouseover and mouseout, the previous object
 * - offsetX        {Number}    X-coordinate relative to target
 * - offsetY        {Number}    Y-coordinate relative to target
 * - clientX        {Number}    X-coordinate relative to viewport
 * - clientY        {Number}    Y-coordinate relative to viewport
 * - screenX        {Number}    X-coordinate relative to the edge of the screen
 * - screenY        {Number}    Y-coordinate relative to the edge of the screen
 * - button         {Number}    Mouse button. Use isButton() to test.
 * - keyCode        {Number}    Key-code
 * - ctrlKey        {Boolean}   Was ctrl key depressed
 * - altKey         {Boolean}   Was alt key depressed
 * - shiftKey       {Boolean}   Was shift key depressed
 * - metaKey        {Boolean}   Was meta key depressed
 *
 * NOTE: The keyCode member contains the raw browser keyCode. For normalized
 * key and character code use {@link goog.events.KeyHandler}.
 * </pre>
 *
 */

goog.provide('goog.events.BrowserEvent');
goog.provide('goog.events.BrowserEvent.MouseButton');

goog.require('goog.events.Event');
goog.require('goog.userAgent');

/**
 * Accepts a browser event object and creates a patched, cross browser event
 * object.
 * The content of this object will not be initialized if no event object is
 * provided. If this is the case, init() needs to be invoked separately.
 * @param {Event} opt_e Browser event object.
 * @param {Node} opt_currentTarget Current target for event.
 * @constructor
 * @extends {goog.events.Event}
 */
goog.events.BrowserEvent = function(opt_e, opt_currentTarget) {
 if (opt_e) {
   this.init(opt_e, opt_currentTarget);
 }
};
goog.inherits(goog.events.BrowserEvent, goog.events.Event);


/**
 * Normalized button constants for the mouse.
 * @enum {number}
 */
goog.events.BrowserEvent.MouseButton = {
  LEFT: 0,
  MIDDLE: 1,
  RIGHT: 2
};


/**
 * Static data for mapping mouse buttons.
 * @type {Array.<number>}
 * @private
 */
goog.events.BrowserEvent.IEButtonMap_ = [
    1, // LEFT
    4, // MIDDLE
    2  // RIGHT
];


/**
 * Event type
 * @type {string?}
 */
 goog.events.BrowserEvent.prototype.type = null;


/**
 * Target that fired the event
 * @type {Node?}
 */
goog.events.BrowserEvent.prototype.target = null;


/**
 * Node that had the listener attached
 * @type {Node|null|undefined}
 */
goog.events.BrowserEvent.prototype.currentTarget;


/**
 * For mouseover and mouseout events, the related object for the event
 * @type {Node?}
 */
goog.events.BrowserEvent.prototype.relatedTarget = null;


/**
 * X-coordinate relative to target
 * @type {number}
 */
goog.events.BrowserEvent.prototype.offsetX = 0;


/**
 * Y-coordinate relative to target
 * @type {number}
 */
goog.events.BrowserEvent.prototype.offsetY = 0;


/**
 * X-coordinate relative to the window
 * @type {number}
 */
goog.events.BrowserEvent.prototype.clientX = 0;


/**
 * Y-coordinate relative to the window
 * @type {number}
 */
goog.events.BrowserEvent.prototype.clientY = 0;


/**
 * X-coordinate relative to the monitor
 * @type {number}
 */
goog.events.BrowserEvent.prototype.screenX = 0;


/**
 * Y-coordinate relative to the monitor
 * @type {number}
 */
goog.events.BrowserEvent.prototype.screenY = 0;


/**
 * Which mouse button was pressed
 * @type {number}
 */
goog.events.BrowserEvent.prototype.button = 0;


/**
 * Keycode of key press
 * @type {number}
 */
goog.events.BrowserEvent.prototype.keyCode = 0;


/**
 * Keycode of key press
 * @type {number}
 */
goog.events.BrowserEvent.prototype.charCode = 0;


/**
 * Whether control was pressed at time of event
 * @type {boolean}
 */
goog.events.BrowserEvent.prototype.ctrlKey = false;


/**
 * Whether alt was pressed at time of event
 * @type {boolean}
 */
goog.events.BrowserEvent.prototype.altKey = false;


/**
 * Whether shift was pressed at time of event
 * @type {boolean}
 */
goog.events.BrowserEvent.prototype.shiftKey = false;


/**
 * Whether the meta key was pressed at time of event
 * @type {boolean}
 */
goog.events.BrowserEvent.prototype.metaKey = false;


/**
 * The browser event object
 * @type {Event}
 * @private
 */
goog.events.BrowserEvent.prototype.event_ = null;


/**
 * Accepts a browser event object and creates a patched, cross browser event
 * object.
 * @param {Event} e Browser event object.
 * @param {Node} opt_currentTarget Current target for event.
 */
goog.events.BrowserEvent.prototype.init = function(e, opt_currentTarget) {
  this.type = e.type;
  this.target = e.target || e.srcElement;
  this.currentTarget = opt_currentTarget;
  if (e.relatedTarget) {
    this.relatedTarget = /** @type {Node} */ (e.relatedTarget);
  } else if (this.type == goog.events.EventType.MOUSEOVER) {
    this.relatedTarget = e.fromElement;
  } else if (this.type == goog.events.EventType.MOUSEOUT) {
    this.relatedTarget = e.toElement;
  } else {
    this.relatedTarget = null;
  }

  this.offsetX = typeof e.layerX == 'number' ? e.layerX : e.offsetX;
  this.offsetY = typeof e.layerY == 'number' ? e.layerY : e.offsetY;
  this.clientX = typeof e.clientX == 'number' ? e.clientX : e.pageX;
  this.clientY = typeof e.clientY == 'number' ? e.clientY : e.pageY;
  this.screenX = e.screenX || 0;
  this.screenY = e.screenY || 0;

  this.button = e.button;

  this.keyCode = e.keyCode || 0;
  this.charCode = e.charCode ||
                 (this.type == goog.events.EventType.KEYPRESS ? e.keyCode : 0);
  this.ctrlKey = e.ctrlKey;
  this.altKey = e.altKey;
  this.shiftKey = e.shiftKey;
  this.metaKey = e.metaKey;
  this.event_ = e;
  delete this.returnValue_;
  delete this.propagationStopped_;
};

/**
 * Tests to see which button was pressed during the event. This is really only
 * useful in IE and Gecko browsers. And in IE, it's only useful for
 * mousedown/mouseup events, because click only fires for the left mouse button.
 *
 * Safari 2 only reports the left button being clicked, and uses the value '1'
 * instead of 0. Opera only reports a mousedown event for the middle button, and
 * no mouse events for the right button. Opera has default behavior for left and
 * middle click that can only be overridden via a configuration setting.
 *
 * There's a nice table of this mess at http://www.unixpapa.com/js/mouse.html.
 *
 * @param {goog.events.BrowserEvent.MouseButton} button The button
 *     to test for.
 * @return {boolean} True if button was pressed.
 */
goog.events.BrowserEvent.prototype.isButton = function(button) {
  if (goog.userAgent.IE) {
    if (this.type == goog.events.EventType.CLICK) {
      return button == goog.events.BrowserEvent.MouseButton.LEFT;
    } else {
      return !!(this.event_.button &
          goog.events.BrowserEvent.IEButtonMap_[button]);
    }
  } else if (goog.userAgent.WEBKIT && !goog.userAgent.isVersion('420')) {
    // Safari 2 only reports mouse events for the left button.
    return this.event_.button == 1 &&
        button == goog.events.BrowserEvent.MouseButton.LEFT;
  } else {
    return this.event_.button == button;
  }
};


/**
 * Override the stop propogation method and give it access to the original
 * event
 */
goog.events.BrowserEvent.prototype.stopPropagation = function() {
  this.propagationStopped_ = true;
  if (this.event_.stopPropagation) {
    this.event_.stopPropagation();
  } else {
    this.event_.cancelBubble = true;
  }
};


/**
 * Override preventDefault and allow access to the original event through a
 * closure
 */
goog.events.BrowserEvent.prototype.preventDefault = function() {
  this.returnValue_ = false;
  if (!this.event_.preventDefault) {
    this.event_.returnValue = false;
    /** @preserveTry */
    try {
      this.event_.keyCode = -1;
    } catch (ex) {
      // IE 7 throws an 'access denied' exception when trying to change
      // keyCode in some situations (e.g. srcElement is input[type=file],
      // or srcElement is an anchor tag rewritten by parent's innerHTML).
      // Do nothing in this case.
    }
  } else {
    this.event_.preventDefault();
  }
};


/**
 * @return {Event} The underlying browser event object.
 */
goog.events.BrowserEvent.prototype.getBrowserEvent = function() {
  return this.event_;
};


/**
 * Disposes of the event.
 */
goog.events.BrowserEvent.prototype.disposeInternal = function() {
  goog.events.BrowserEvent.superClass_.disposeInternal.call(this);
  this.event_ = null;
};

// Copyright 2005 Google Inc.
// All Rights Reserved
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 
//  * Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
//  * Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in
//    the documentation and/or other materials provided with the
//    distribution.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
// INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
// BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
// LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
// ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE. 

/**
 * @fileoverview Listener object.
 */

/**
 * Namespace for events
 */
goog.provide('goog.events.Listener');

/**
 * Simple class that stores information about a listener
 * @constructor
 */
goog.events.Listener = function() {
};


/**
 * Counter used to create a unique key
 * @type {number}
 * @private
 */
goog.events.Listener.counter_ = 0;


/**
 * Whether the listener is a function or an object that implements handleEvent.
 * @type {boolean?}
 * @private
 */
goog.events.Listener.prototype.isFunctionListener_ = null;


/**
 * Call back function or an object with a handleEvent function.
 * @type {Function|Object|null}
 */
goog.events.Listener.prototype.listener = null;


/**
 * Proxy for callback that passes through {@link goog.events#HandleEvent_}
 * @type {Function?}
 */
goog.events.Listener.prototype.proxy = null;


/**
 * Object or node that callback is listening to
 * @type {Object?}
 */
goog.events.Listener.prototype.src = null;


/**
 * Type of event
 * @type {string?}
 */
goog.events.Listener.prototype.type = null;


/**
 * Whether the listener is being called in the capture or bubble phase
 * @type {boolean?}
 */
goog.events.Listener.prototype.capture = null;


/**
 * Optional object whose context to execute the listener in
 * @type {Object?}
 */
goog.events.Listener.prototype.handler = null;


/**
 * The key of the listener.
 * @type {number}
 */
goog.events.Listener.prototype.key = 0;


/**
 * Whether the listener has been removed.
 * @type {boolean}
 */
goog.events.Listener.prototype.removed = false;


/**
 * Whether to remove the listener after it has been called.
 * @type {boolean}
 */
goog.events.Listener.prototype.callOnce = false;


/**
 * Initializes the listener.
 * @param {Function|Object} listener Callback function, or an object with a
 *     handleEvent function.
 * @param {Function} proxy Wrapper for the listener that patches the event.
 * @param {Object} src Source object for the event.
 * @param {string} type Event type.
 * @param {boolean} capture Whether in capture or bubble phase.
 * @param {Object} handler Object in who's context to execute the callback.
 */
goog.events.Listener.prototype.init = function(listener, proxy, src, type,
                                               capture, handler) {
  // we do the test of the listener here so that we do  not need to
  // continiously do this inside handleEvent
  if (goog.isFunction(listener)) {
    this.isFunctionListener_ = true;
  } else if (listener && listener.handleEvent &&
      goog.isFunction(listener.handleEvent)) {
    this.isFunctionListener_ = false;
  } else {
   throw Error('Invalid listener argument');
  }

  this.listener = listener;
  this.proxy = proxy;
  this.src = src;
  this.type = type;
  this.capture = !!capture;
  this.handler = handler;
  this.callOnce = false;
  this.key = ++goog.events.Listener.counter_;
  this.removed = false;
};


/**
 * Calls the internal listener
 * @param {Object} eventObject Event object to be passed to listener.
 * @return {boolean} The result of the internal listener call.
 */
goog.events.Listener.prototype.handleEvent = function(eventObject) {
  if (this.isFunctionListener_) {
    return this.listener.call(this.handler || this.src, eventObject);
  }
  return this.listener.handleEvent.call(this.listener, eventObject);
};

// Copyright 2006 Google Inc.
// All Rights Reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 
//  * Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
//  * Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in
//    the documentation and/or other materials provided with the
//    distribution.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
// INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
// BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
// LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
// ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE. 

/**
 * @fileoverview Utilities for manipulating objects/maps/hashes.
 */

goog.provide('goog.object');


/**
 * Calls a function for each element in an object/map/hash.
 *
 * @param {Object} obj The object over which to iterate.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the object)
 *     and the return value is irrelevant.
 * @param {Object} opt_obj This is used as the 'this' object within f.
 */
goog.object.forEach = function(obj, f, opt_obj) {
  for (var key in obj) {
    f.call(opt_obj, obj[key], key, obj);
  }
};


/**
 * Calls a function for each element in an object/map/hash. If that call returns
 * true, adds the element to a new object.
 *
 * @param {Object} obj The object over which to iterate.
 * @param {Function} f The function to call for every element. This
 *     function takes 3 arguments (the element, the index and the object)
 *     and should return a boolean. If the return value is true the
 *     element is added to the result object. If it is false the
 *     element is not included.
 * @param {Object} opt_obj This is used as the 'this' object within f.
 * @return {Object} a new object in which only elements that passed the test
 *     are present.
 */
goog.object.filter = function(obj, f, opt_obj) {
  var res = {};
  for (var key in obj) {
    if (f.call(opt_obj, obj[key], key, obj)) {
      res[key] = obj[key];
    }
  }
  return res;
};


/**
 * For every element in an object/map/hash calls a function and inserts the
 * result into a new object.
 *
 * @param {Object} obj The object over which to iterate.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the object)
 *     and should return something. The result will be inserted
 *     into a new object.
 * @param {Object} opt_obj This is used as the 'this' object within f.
 * @return {Object} a new object with the results from f.
 */
goog.object.map = function(obj, f, opt_obj) {
  var res = {};
  for (var key in obj) {
    res[key] = f.call(opt_obj, obj[key], key, obj);
  }
  return res;
};


/**
 * Calls a function for each element in an object/map/hash. If any
 * call returns true, returns true (without checking the rest). If
 * all calls return false, returns false.
 *
 * @param {Object} obj The object to check.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the object) and should
 *     return a boolean.
 * @param {Object} opt_obj This is used as the 'this' object within f.
 * @return {boolean} true if any element passes the test.
 */
goog.object.some = function(obj, f, opt_obj) {
  for (var key in obj) {
    if (f.call(opt_obj, obj[key], key, obj)) {
      return true;
    }
  }
  return false;
};


/**
 * Calls a function for each element in an object/map/hash. If
 * all calls return true, returns true. If any call returns false, returns
 * false at this point and does not continue to check the remaining elements.
 *
 * @param {Object} obj The object to check.
 * @param {Function} f The function to call for every element. This function
 *     takes 3 arguments (the element, the index and the object) and should
 *     return a boolean.
 * @param {Object} opt_obj This is used as the 'this' object within f.
 * @return {boolean} false if any element fails the test.
 */
goog.object.every = function(obj, f, opt_obj) {
  for (var key in obj) {
    if (!f.call(opt_obj, obj[key], key, obj)) {
      return false;
    }
  }
  return true;
};


/**
 * Returns the number of key-value pairs in the object map.
 *
 * @param {Object} obj The object for which to get the number of key-value
 *     pairs.
 * @return {number} The number of key-value pairs in the object map.
 */
goog.object.getCount = function(obj) {
  // JS1.5 has __count__ but it has been deprecated so it raises a warning...
  // in other words do not use. Also __count__ only includes the fields on the
  // actual object and not in the prototype chain.
  var rv = 0;
  for (var key in obj) {
    rv++;
  }
  return rv;
};


/**
 * Returns one key from the object map, if any exists.
 * For map literals the returned key will be the first one in most of the
 * browsers (a know exception is Konqueror).
 *
 * @param {Object} obj The object to pick a key from.
 * @return {string|undefined} The key or undefined if the object is empty.
 */
goog.object.getAnyKey = function(obj) {
  for (var key in obj) {
    return key;
  }
};


/**
 * Returns one value from the object map, if any exists.
 * For map literals the returned value will be the first one in most of the
 * browsers (a know exception is Konqueror).
 *
 * @param {Object} obj The object to pick a value from.
 * @return {*} The value or undefined if the object is empty.
 */
goog.object.getAnyValue = function(obj) {
  for (var key in obj) {
    return obj[key];
  }
};


/**
 * Whether the object/hash/map contains the given object as a value.
 * An alias for goog.object.containsValue(obj, val).
 *
 * @param {Object} obj The object in which to look for val.
 * @param {*} val The object for which to check.
 * @return {boolean} true if val is present.
 */
goog.object.contains = function(obj, val) {
  return goog.object.containsValue(obj, val);
};


/**
 * Returns the values of the object/map/hash.
 *
 * @param {Object} obj The object from which to get the values.
 * @return {Array} The values in the object/map/hash.
 */
goog.object.getValues = function(obj) {
  var res = [];
  var i = 0;
  for (var key in obj) {
    res[i++] = obj[key];
  }
  return res;
};


/**
 * Returns the keys of the object/map/hash.
 *
 * @param {Object} obj The object from which to get the keys.
 * @return {Array.<string>} Array of property keys.
 */
goog.object.getKeys = function(obj) {
  var res = [];
  var i = 0;
  for (var key in obj) {
    res[i++] = key;
  }
  return res;
};


/**
 * Whether the object/map/hash contains the given key.
 *
 * @param {Object} obj The object in which to look for key.
 * @param {string} key The key for which to check.
 * @return {boolean} true If the map contains the key.
 */
goog.object.containsKey = function(obj, key) {
  return key in obj;
};


/**
 * Whether the object/map/hash contains the given value. This is O(n).
 *
 * @param {Object} obj The object in which to look for val.
 * @param {*} val The value for which to check.
 * @return {boolean} true If the map contains the value.
 */
goog.object.containsValue = function(obj, val) {
  for (var key in obj) {
    if (obj[key] == val) {
      return true;
    }
  }
  return false;
};


/**
 * Searches an object for an element that satisfies the given condition and
 * returns its key.
 * @param {Object} obj The object to search in.
 * @param {function(*, string, Object): boolean} f The function to call for
 *     every element. Takes 3 arguments (the value, the key and the object) and
 *     should return a boolean.
 * @param {Object} opt_this An optional "this" context for the function.
 * @return {string|undefined} The key of an element for which the function
 *     returns true or undefined if no such element is found.
 */
goog.object.findKey = function(obj, f, opt_this) {
  for (var key in obj) {
    if (f.call(opt_this, obj[key], key, obj)) {
      return key;
    }
  }
  return undefined;
};


/**
 * Searches an object for an element that satisfies the given condition and
 * returns its value.
 * @param {Object} obj The object to search in.
 * @param {function(*, string, Object): boolean} f The function to call for
 *     every element. Takes 3 arguments (the value, the key and the object) and
 *     should return a boolean.
 * @param {Object} opt_this An optional "this" context for the function.
 * @return {*} The value of an element for which the function returns true or
 *     undefined if no such element is found.
 */
goog.object.findValue = function(obj, f, opt_this) {
  var key = goog.object.findKey(obj, f, opt_this);
  return key && obj[key];
};


/**
 * Whether the object/map/hash is empty.
 *
 * @param {Object} obj The object to test.
 * @return {boolean} true if obj is empty.
 */
goog.object.isEmpty = function(obj) {
  for (var key in obj) {
    return false;
  }
  return true;
};


/**
 * Removes all key value pairs from the object/map/hash.
 *
 * @param {Object} obj The object to clear.
 */
goog.object.clear = function(obj) {
  // Some versions of IE has problems if we delete keys from the beginning
  var keys = goog.object.getKeys(obj);
  for (var i = keys.length - 1; i >= 0; i--) {
    goog.object.remove(obj, keys[i]);
  }
};


/**
 * Removes a key-value pair based on the key.
 *
 * @param {Object} obj The object from which to remove the key.
 * @param {string} key The key to remove.
 * @return {boolean} Whether an element was removed.
 */
goog.object.remove = function(obj, key) {
  var rv;
  if ((rv = key in obj)) {
    delete obj[key];
  }
  return rv;
};


/**
 * Adds a key-value pair to the object. Throws an exception if the key is
 * already in use. Use set if you want to change an existing pair.
 *
 * @param {Object} obj The object to which to add the key-value pair.
 * @param {string} key The key to add.
 * @param {*} val The value to add.
 */
goog.object.add = function(obj, key, val) {
  if (key in obj) {
    throw Error('The object already contains the key "' + key + '"');
  }
  goog.object.set(obj, key, val);
};


/**
 * Returns the value for the given key.
 *
 * @param {Object} obj The object from which to get the value.
 * @param {string} key The key for which to get the value.
 * @param {*} opt_val The value to return if no item is found for the given
 *     key (default is undefined).
 * @return {*} The value for the given key.
 */
goog.object.get = function(obj, key, opt_val) {
  if (key in obj) {
    return obj[key];
  }
  return opt_val;
};


/**
 * Adds a key-value pair to the object/map/hash.
 *
 * @param {Object} obj The object to which to add the key-value pair.
 * @param {string} key The key to add.
 * @param {*} value The value to add.
 */
goog.object.set = function(obj, key, value) {
  obj[key] = value;
};


/**
 * Adds a key-value pair to the object/map/hash if it doesn't exist yet.
 *
 * @param {Object} obj The object to which to add the key-value pair.
 * @param {string} key The key to add.
 * @param {*} value The value to add if the key wasn't present.
 * @return {*} The value of the entry at the end of the function.
 */
goog.object.setIfUndefined = function(obj, key, value) {
  return key in obj ? obj[key] : (obj[key] = value);
};


/**
 * Does a flat clone of the object.
 *
 * @param {Object} obj Object to clone.
 * @return {Object} Clone of the input object.
 */
goog.object.clone = function(obj) {
  // We cannot use the prototype trick because a lot of methods depend on where
  // the actual key is set.

  var res = {};
  for (var key in obj) {
    res[key] = obj[key];
  }
  return res;
  // We could also use goog.mixin but I wanted this to be independent from that.
};


/**
 * Returns a new object in which all the keys and values are interchanged
 * (keys become values and values become keys). If multiple keys map to the
 * same value, the chosen transposed value is implementation-dependent.
 *
 * @param {Object} obj The object to transpose.
 * @return {Object} The transposed object.
 */
goog.object.transpose = function(obj) {
  var transposed = {};
  var keys = goog.object.getKeys(obj);
  for (var i = 0, len = keys.length; i < len; i++) {
    var key = keys[i];
    transposed[obj[key]] = key;
  }
  return transposed;
};


/**
 * The names of the fields that are defined on Object.prototype.
 * @type {Array.<string>}
 * @private
 */
goog.object.PROTOTYPE_FIELDS_ = [
  'constructor',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toLocaleString',
  'toString',
  'valueOf'
];


/**
 * Extends an object with another object.
 * This operates 'in-place'; it does not create a new Object.
 *
 * Example:
 * var o = {};
 * goog.object.extend(o, {a: 0, b: 1});
 * o; // {a: 0, b: 1}
 * goog.object.extend(o, {c: 2});
 * o; // {a: 0, b: 1, c: 2}
 *
 * @param {Object} target  The object to modify.
 * @param {Object} var_args The objects from which values will be copied.
 */
goog.object.extend = function(target, var_args) {
  var key, source;
  for (var i = 1; i < arguments.length; i++) {
    source = arguments[i];
    for (key in source) {
      target[key] = source[key];
    }

    // For IE the for-in-loop does not contain any properties that are not
    // enumerable on the prototype object (for example isPrototypeOf from
    // Object.prototype) and it will also not include 'replace' on objects that
    // extend String and change 'replace' (not that it is common for anyone to
    // extend anything except Object).

    for (var j = 0; j < goog.object.PROTOTYPE_FIELDS_.length; j++) {
      key = goog.object.PROTOTYPE_FIELDS_[j];
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }
};


/**
 * Creates a new object built from the key-value pairs provided as arguments.
 * @param {*} var_args If only one argument is provided and it is an array then
 *     this is used as the arguments,  otherwise even arguments are used as the
 *     property names and odd arguments are used as the property values.
 * @return {Object} The new object.
 * @throws {Error} If there are uneven number of arguments or there is only one
 *     non array argument.
 */
goog.object.create = function(var_args) {
  var argLength = arguments.length;
  if (argLength == 1 && goog.isArray(arguments[0])) {
    return goog.object.create.apply(null, arguments[0]);
  }

  if (argLength % 2) {
    throw Error('Uneven number of arguments');
  }

  var rv = {};
  for (var i = 0; i < argLength; i += 2) {
    rv[arguments[i]] = arguments[i + 1];
  }
  return rv;
};


/**
 * Creates a new object where the property names come from the arguments but
 * the value is always set to true
 * @param {*} var_args If only one argument is provided and it is an array then
 *     this is used as the arguments,  otherwise the arguments are used as the
 *     property names.
 * @return {Object} The new object.
 */
goog.object.createSet = function(var_args) {
  var argLength = arguments.length;
  if (argLength == 1 && goog.isArray(arguments[0])) {
    return goog.object.createSet.apply(null, arguments[0]);
  }

  var rv = {};
  for (var i = 0; i < argLength; i++) {
    rv[arguments[i]] = true;
  }
  return rv;
};

// Copyright 2006 Google Inc. All Rights Reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 
//  * Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
//  * Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in
//    the documentation and/or other materials provided with the
//    distribution.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
// INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
// BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
// LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
// ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE. 

/**
 * @fileoverview Utilities for manipulating the browser's Document Object Model
 * Inspiration taken *heavily* from mochikit (http://mochikit.com/).
 *
 * If you want to do extensive DOM building you can create local aliases,
 * such as:<br>
 * var $DIV = goog.bind(goog.dom.createDom, goog.dom, 'div');<br>
 * var $A = goog.bind(goog.dom.createDom, goog.dom, 'a');<br>
 * var $TABLE = goog.bind(goog.dom.createDom, goog.dom, 'table');<br>
 *
 * You can use {@link goog.dom.DomHelper} to create new dom helpers that refer
 * to a different document object.  This is useful if you are working with
 * frames or multiple windows.
 *
 */


goog.provide('goog.dom');
goog.provide('goog.dom.DomHelper');
goog.provide('goog.dom.NodeType');

goog.require('goog.array');
goog.require('goog.dom.TagName');
goog.require('goog.dom.classes');
goog.require('goog.math.Coordinate');
goog.require('goog.math.Size');
goog.require('goog.object');
goog.require('goog.string');
goog.require('goog.userAgent');


/**
 * @define {boolean} Whether we know at compile time that the browser is in
 * quirks mode.
 */
goog.dom.ASSUME_QUIRKS_MODE = false;


/**
 * @define {boolean} Whether we know at compile time that the browser is in
 * standards compliance mode.
 */
goog.dom.ASSUME_STANDARDS_MODE = false;


/**
 * Whether we know the compatibility mode at compile time.
 * @type {boolean}
 * @private
 */
goog.dom.COMPAT_MODE_KNOWN_ =
    goog.dom.ASSUME_QUIRKS_MODE || goog.dom.ASSUME_STANDARDS_MODE;


/**
 * Enumeration for DOM node types (for reference)
 * @enum {number}
 */
goog.dom.NodeType = {
  ELEMENT: 1,
  ATTRIBUTE: 2,
  TEXT: 3,
  CDATA_SECTION: 4,
  ENTITY_REFERENCE: 5,
  ENTITY: 6,
  PROCESSING_INSTRUCTION: 7,
  COMMENT: 8,
  DOCUMENT: 9,
  DOCUMENT_TYPE: 10,
  DOCUMENT_FRAGMENT: 11,
  NOTATION: 12
};


/**
 * Returns the default DomHelper (that is, the DomHelper for the default
 * document). A DomHelper is used for calling methods that depend on a
 * particular document instance.
 * @private
 * @return {!goog.dom.DomHelper} The default dom helper.
 */
goog.dom.getDefaultDomHelper_ = function() {
  return goog.dom.defaultDomHelper_ ||
      (goog.dom.defaultDomHelper_ = new goog.dom.DomHelper());
};


/**
 * Gets the DomHelper object for the document where the element resides.
 * @param {Node} opt_element If present, gets the DomHelper for this element.
 * @return {!goog.dom.DomHelper} The DomHelper.
 */
goog.dom.getDomHelper = function(opt_element) {
  return opt_element ?
      new goog.dom.DomHelper(goog.dom.getOwnerDocument(opt_element)) :
      goog.dom.getDefaultDomHelper_();
};


/**
 * Gets the document object being used by the dom library.
 * @return {!Document} Document object.
 */
goog.dom.getDocument = function() {
  return document;
};


/**
 * Alias for getElementById. If a DOM node is passed in then we just return
 * that.
 * @param {string|Element} element Element ID or a DOM node.
 * @return {Element} The element with the given ID, or the node passed in.
 */
goog.dom.getElement = function(element) {
  return goog.isString(element) ?
      document.getElementById(element) : element;
};


/**
 * Alias for getElement.
 * @param {string|Element} element Element ID or a DOM node.
 * @return {Element} The element with the given ID, or the node passed in.
 */
goog.dom.$ = goog.dom.getElement;


/**
 * Looks up elements by both tag and class name, using browser native functions
 * ({@code querySelectorAll}, {@code getElementsByTagName} or
 * {@code getElementsByClassName}) where possible. The returned array is a live
 * NodeList or a static list depending on the code path taken. This function
 * is a useful, if limited, way of collecting a list of DOM elements
 * with certain characteristics.  {@code goog.dom.query} offers a
 * more powerful and general solution which allows matching on CSS 3
 * selector expressions, but at increased cost in code size. If all you
 * need is particular tags belonging to a single class, this function
 * is fast and sleek.
 *
 * @see goog.dom.query
 *
 * @param {string} opt_tag Element tag name.
 * @param {string} opt_class Optional class name.
 * @param {Element} opt_el Optional element to look in.
 * @return {Array.<Element>|NodeList} Array-like list of elements (only a length
 *     property and numerical indices are guaranteed to exist).
 */
goog.dom.getElementsByTagNameAndClass = function(opt_tag, opt_class, opt_el) {
  return goog.dom.getDefaultDomHelper_().getElementsByTagNameAndClass(
      opt_tag, opt_class, opt_el);
};


/**
 * Alias for {@code getElementsByTagNameAndClass}.
 * @param {?string} opt_tag Element tag name.
 * @param {?string} opt_class Optional class name.
 * @param {Element} opt_el Optional element to look in.
 * @return {Array.<Element>|NodeList} Array-like list of elements (only a length
 *     property and numerical indices are guaranteed to exist).
 */
goog.dom.$$ = goog.dom.getElementsByTagNameAndClass;


/**
 * Sets multiple properties on a node.
 * @param {Element} element DOM node to set properties on.
 * @param {Object} properties Hash of property:value pairs.
 */
goog.dom.setProperties = function(element, properties) {
  goog.object.forEach(properties, function(val, key) {
    if (key == 'style') {
      element.style.cssText = val;
    } else if (key == 'class') {
      element.className = val;
    } else if (key == 'for') {
      element.htmlFor = val;
    } else if (key in goog.dom.DIRECT_ATTRIBUTE_MAP_) {
      element.setAttribute(goog.dom.DIRECT_ATTRIBUTE_MAP_[key], val);
    } else {
      element[key] = val;
    }
  });
};


/**
 * Map of attributes that should be set using
 * element.setAttribute(key, val) instead of element[key] = val.  Used
 * by goog.dom.setProperties.
 *
 * @type {Object}
 * @private
 */
goog.dom.DIRECT_ATTRIBUTE_MAP_ = {
  'cellpadding': 'cellPadding',
  'cellspacing': 'cellSpacing',
  'colspan': 'colSpan',
  'rowspan': 'rowSpan',
  'valign': 'vAlign',
  'height': 'height',
  'width': 'width',
  'usemap': 'useMap',
  'frameborder': 'frameBorder',
  'type': 'type'
};


/**
 * Gets the dimensions of the viewport.
 *
 * Gecko Standards mode:
 * docEl.clientWidth  Width of viewport excluding scrollbar.
 * win.innerWidth     Width of viewport including scrollbar.
 * body.clientWidth   Width of body element.
 *
 * docEl.clientHeight Height of viewport excluding scrollbar.
 * win.innerHeight    Height of viewport including scrollbar.
 * body.clientHeight  Height of document.
 *
 * Gecko Backwards compatible mode:
 * docEl.clientWidth  Width of viewport excluding scrollbar.
 * win.innerWidth     Width of viewport including scrollbar.
 * body.clientWidth   Width of viewport excluding scrollbar.
 *
 * docEl.clientHeight Height of document.
 * win.innerHeight    Height of viewport including scrollbar.
 * body.clientHeight  Height of viewport excluding scrollbar.
 *
 * IE6/7 Standards mode:
 * docEl.clientWidth  Width of viewport excluding scrollbar.
 * win.innerWidth     Undefined.
 * body.clientWidth   Width of body element.
 *
 * docEl.clientHeight Height of viewport excluding scrollbar.
 * win.innerHeight    Undefined.
 * body.clientHeight  Height of document element.
 *
 * IE5 + IE6/7 Backwards compatible mode:
 * docEl.clientWidth  0.
 * win.innerWidth     Undefined.
 * body.clientWidth   Width of viewport excluding scrollbar.
 *
 * docEl.clientHeight 0.
 * win.innerHeight    Undefined.
 * body.clientHeight  Height of viewport excluding scrollbar.
 *
 * Opera 9 Standards and backwards compatible mode:
 * docEl.clientWidth  Width of viewport excluding scrollbar.
 * win.innerWidth     Width of viewport including scrollbar.
 * body.clientWidth   Width of viewport excluding scrollbar.
 *
 * docEl.clientHeight Height of document.
 * win.innerHeight    Height of viewport including scrollbar.
 * body.clientHeight  Height of viewport excluding scrollbar.
 *
 * WebKit:
 * Safari 2
 * docEl.clientHeight Same as scrollHeight.
 * docEl.clientWidth  Same as innerWidth.
 * win.innerWidth     Width of viewport excluding scrollbar.
 * win.innerHeight    Height of the viewport including scrollbar.
 * frame.innerHeight  Height of the viewport exluding scrollbar.
 *
 * Safari 3 (tested in 522)
 *
 * docEl.clientWidth  Width of viewport excluding scrollbar.
 * docEl.clientHeight Height of viewport excluding scrollbar in strict mode.
 * body.clientHeight  Height of viewport excluding scrollbar in quirks mode.
 *
 * @param {Window} opt_window Optional window element to test.
 * @return {!goog.math.Size} Object with values 'width' and 'height'.
 */
goog.dom.getViewportSize = function(opt_window) {
  var win = opt_window || goog.global || window;
  var doc = win.document;

  if (goog.userAgent.WEBKIT && !goog.userAgent.isVersion('500') &&
      !goog.userAgent.MOBILE) {
    if (typeof win.innerHeight == 'undefined') {
      win = window;
    }
    var innerHeight = win.innerHeight;
    var scrollHeight = win.document.documentElement.scrollHeight;

    if (win == win.top) {
      if (scrollHeight < innerHeight) {
        innerHeight -= 15; // Scrollbars are 15px wide on Mac
      }
    }
    return new goog.math.Size(win.innerWidth, innerHeight);
  }

  var dh = goog.dom.getDomHelper(doc);

  var el =
      dh.isCss1CompatMode() &&
          // Older versions of Opera used to read from document.body, but this
          // changed with 9.5
          (!goog.userAgent.OPERA ||
              goog.userAgent.OPERA && goog.userAgent.isVersion('9.50')) ?
                  doc.documentElement : doc.body;

  return new goog.math.Size(el.clientWidth, el.clientHeight);
};


/**
 * Gets the page scroll distance as a coordinate object.
 *
 * @param {Window} opt_window Optional window element to test.
 * @return {!goog.math.Coordinate} Object with values 'x' and 'y'.
 * @deprecated Use {@link goog.dom.getDocumentScroll} instead.
 */
goog.dom.getPageScroll = function(opt_window) {
  var win = opt_window || goog.global || window;
  return goog.dom.getDomHelper(win.document).getDocumentScroll();
};


/**
 * Gets the document scroll distance as a coordinate object.
 *
 * @return {!goog.math.Coordinate} Object with values 'x' and 'y'.
 */
goog.dom.getDocumentScroll = function() {
  return goog.dom.getDefaultDomHelper_().getDocumentScroll();
};


/**
 * Gets the window object associated with the given document.
 *
 * @param {Document} opt_doc  Document object to get window for.
 * @return {!Window} The window associated with the given document.
 */
goog.dom.getWindow = function(opt_doc) {
  return goog.dom.getDomHelper(opt_doc).getWindow();
};


/**
 * Returns a dom node with a set of attributes.  This function accepts varargs
 * for subsequent nodes to be added.  Subsequent nodes will be added to the
 * first node as childNodes.
 *
 * So:
 * <code>createDom('div', null, createDom('p'), createDom('p'));</code>
 * would return a div with two child paragraphs
 *
 * @param {string} tagName Tag to create.
 * @param {Object?} opt_attributes Map of name-value pairs for attributes.
 * @param {Object|string|Array|NodeList} var_args Further DOM nodes or strings
 *     for text nodes. If one of the var_args is an array or NodeList, its
 *     elements will be added as childNodes instead.
 * @return {!Element} Reference to a DOM node.
 */
goog.dom.createDom = function(tagName, opt_attributes, var_args) {
  var dh = goog.dom.getDefaultDomHelper_();
  return dh.createDom.apply(dh, arguments);
};


/**
 * Alias for {@code createDom}.
 * @param {string} tagName Tag to create.
 * @param {Object?} opt_attributes Map of name-value pairs for attributes.
 * @param {Object|Array} var_args Further DOM nodes or strings for text nodes.
 *     If one of the var_args is an array, its children will be added as
 *     childNodes instead.
 * @return {!Element} Reference to a DOM node.
 */
goog.dom.$dom = goog.dom.createDom;


/**
 * Creates a new element.
 * @param {string} name Tag name.
 * @return {!Element} The new element.
 */
goog.dom.createElement = function(name) {
  return document.createElement(name);
};


/**
 * Creates a new text node.
 * @param {string} content Content.
 * @return {!Text} The new text node.
 */
goog.dom.createTextNode = function(content) {
  return document.createTextNode(content);
};


/**
 * Converts an HTML string into a document fragment.
 *
 * @param {string} htmlString The HTML string to convert.
 * @return {!Node} The resulting document fragment.
 */
goog.dom.htmlToDocumentFragment = function(htmlString) {
  return goog.dom.getDefaultDomHelper_().htmlToDocumentFragment(htmlString);
};


/**
 * Returns the compatMode of the document.
 * @return {string} The result is either CSS1Compat or BackCompat.
 * @deprecated use goog.dom.isCss1CompatMode instead.
 */
goog.dom.getCompatMode = function() {
  return goog.dom.isCss1CompatMode() ? 'CSS1Compat' : 'BackCompat';
};


/**
 * Returns true if the browser is in "CSS1-compatible" (standards-compliant)
 * mode, false otherwise.
 * @return {boolean} True if in CSS1-compatible mode.
 */
goog.dom.isCss1CompatMode = function() {
  return goog.dom.COMPAT_MODE_KNOWN_ ?
      goog.dom.ASSUME_STANDARDS_MODE :
      goog.dom.getDefaultDomHelper_().isCss1CompatMode();
};


/**
 * Determines if the given node can contain children.
 * @param {Node} node The node to check.
 * @return {boolean} Whether the node can contain children.
 */
goog.dom.canHaveChildren = function(node) {
  if (node.nodeType != goog.dom.NodeType.ELEMENT) {
    return false;
  }
  if ('canHaveChildren' in node) {
    // IE supports this natively.
    return node.canHaveChildren;
  }
  switch (node.tagName) {
    case goog.dom.TagName.APPLET:
    case goog.dom.TagName.AREA:
    case goog.dom.TagName.BR:
    case goog.dom.TagName.COL:
    case goog.dom.TagName.FRAME:
    case goog.dom.TagName.HR:
    case goog.dom.TagName.IMG:
    case goog.dom.TagName.INPUT:
    case goog.dom.TagName.IFRAME:
    case goog.dom.TagName.ISINDEX:
    case goog.dom.TagName.LINK:
    case goog.dom.TagName.NOFRAMES:
    case goog.dom.TagName.NOSCRIPT:
    case goog.dom.TagName.META:
    case goog.dom.TagName.OBJECT:
    case goog.dom.TagName.PARAM:
    case goog.dom.TagName.SCRIPT:
    case goog.dom.TagName.STYLE:
      return false;
  }
  return true;
};


/**
 * Appends a child to a node.
 * @param {Node} parent Parent.
 * @param {Node} child Child.
 */
goog.dom.appendChild = function(parent, child) {
  parent.appendChild(child);
};


/**
 * Removes all the child nodes on a DOM node.
 * @param {Node} node Node to remove children from.
 */
goog.dom.removeChildren = function(node) {
  // Note: Iterations over live collections can be slow, this is the fastest
  // we could find. The double parenthesis are used to prevent JsCompiler and
  // strict warnings.
  var child;
  while ((child = node.firstChild)) {
    node.removeChild(child);
  }
};


/**
 * Inserts a new node before an existing reference node (i.e. as the previous
 * sibling). If the reference node has no parent, then does nothing.
 * @param {Node} newNode Node to insert.
 * @param {Node} refNode Reference node to insert before.
 */
goog.dom.insertSiblingBefore = function(newNode, refNode) {
  if (refNode.parentNode) {
    refNode.parentNode.insertBefore(newNode, refNode);
  }
};


/**
 * Inserts a new node after an existing reference node (i.e. as the next
 * sibling). If the reference node has no parent, then does nothing.
 * @param {Node} newNode Node to insert.
 * @param {Node} refNode Reference node to insert after.
 */
goog.dom.insertSiblingAfter = function(newNode, refNode) {
  if (refNode.parentNode) {
    refNode.parentNode.insertBefore(newNode, refNode.nextSibling);
  }
};


/**
 * Removes a node from its parent.
 * @param {Node} node The node to remove.
 * @return {Node?} The node removed if removed; else, null.
 */
goog.dom.removeNode = function(node) {
  return node && node.parentNode ? node.parentNode.removeChild(node) : null;
};


/**
 * Replaces a node in the DOM tree. Will do nothing if {@code oldNode} has no
 * parent.
 * @param {Node} newNode Node to insert.
 * @param {Node} oldNode Node to replace.
 */
goog.dom.replaceNode = function(newNode, oldNode) {
  var parent = oldNode.parentNode;
  if (parent) {
    parent.replaceChild(newNode, oldNode);
  }
};


/**
 * Flattens an element. That is, removes it and replace it with its children.
 * Does nothing if the element is not in the document.
 * @param {Element} element The element to flatten.
 * @return {Element|undefined} The original element, detached from the document
 *     tree, sans children; or undefined, if the element was not in the
 *     document to begin with.
 */
goog.dom.flattenElement = function(element) {
  var child, parent = element.parentNode;
  if (parent && parent.nodeType != goog.dom.NodeType.DOCUMENT_FRAGMENT) {
    // Use IE DOM method (supported by Opera too) if available
    if (element.removeNode) {
      return /** @type {Element} */ (element.removeNode(false));
    } else {
      // Move all children of the original node up one level.
      while ((child = element.firstChild)) {
        parent.insertBefore(child, element);
      }

      // Detach the original element.
      return /** @type {Element} */ (goog.dom.removeNode(element));
    }
  }
};


/**
 * Returns the first child node that is an element.
 * @param {Node} node The node to get the first child element of.
 * @return {Element?} The first child node of {@code node} that is an element.
 */
goog.dom.getFirstElementChild = function(node) {
  return goog.dom.getNextElementNode_(node.firstChild, true);
};


/**
 * Returns the last child node that is an element.
 * @param {Node} node The node to get the last child element of.
 * @return {Element?} The last child node of {@code node} that is an element.
 */
goog.dom.getLastElementChild = function(node) {
  return goog.dom.getNextElementNode_(node.lastChild, false);
};


/**
 * Returns the first next sibling that is an element.
 * @param {Node} node The node to get the next sibling element of.
 * @return {Element?} The next sibling of {@code node} that is an element.
 */
goog.dom.getNextElementSibling = function(node) {
  return goog.dom.getNextElementNode_(node.nextSibling, true);
};


/**
 * Returns the first previous sibling that is an element.
 * @param {Node} node The node to get the previous sibling element of.
 * @return {Element?} The first previous sibling of {@code node} that is
 *     an element.
 */
goog.dom.getPreviousElementSibling = function(node) {
  return goog.dom.getNextElementNode_(node.previousSibling, false);
};


/**
 * Returns the first node that is an element in the specified direction,
 * starting with {@code node}.
 * @private
 * @param {Node?} node The node to get the next element from.
 * @param {boolean} forward Whether to look forwards or backwards.
 * @return {Element?} The first element.
 */
goog.dom.getNextElementNode_ = function(node, forward) {
  while (node && node.nodeType != goog.dom.NodeType.ELEMENT) {
    node = forward ? node.nextSibling : node.previousSibling;
  }

  return /** @type {Element?} */ (node);
};


/**
 * Whether the object looks like a DOM node.
 * @param {Object} obj The object being tested for node likeness.
 * @return {boolean} Whether the object looks like a DOM node.
 */
goog.dom.isNodeLike = function(obj) {
  return goog.isObject(obj) && obj.nodeType > 0;
};


/**
 * Safari contains is broken, but appears to be fixed in WebKit 522+
 * @type {boolean}
 * @private
 */
goog.dom.BAD_CONTAINS_WEBKIT_ = goog.userAgent.WEBKIT &&
    goog.userAgent.compare(goog.userAgent.VERSION, '521') <= 0;


/**
 * Whether a node contains another node.
 * @param {Node} parent The node that should contain the other node.
 * @param {Node} descendant The node to test presence of.
 * @return {boolean} Whether the parent node contains the descendent node.
 */
goog.dom.contains = function(parent, descendant) {
  // We use browser specific methods for this if available since it is faster
  // that way.

  // IE / Safari(some) DOM
  if (typeof parent.contains != 'undefined' && !goog.dom.BAD_CONTAINS_WEBKIT_ &&
      descendant.nodeType == goog.dom.NodeType.ELEMENT) {
    return parent == descendant || parent.contains(descendant);
  }

  // W3C DOM Level 3
  if (typeof parent.compareDocumentPosition != 'undefined') {
    return parent == descendant ||
        Boolean(parent.compareDocumentPosition(descendant) & 16);
  }

  // W3C DOM Level 1
  while (descendant && parent != descendant) {
    descendant = descendant.parentNode;
  }
  return descendant == parent;
};


/**
 * Compares the document order of two nodes, returning 0 if they are the same
 * node, a negative number if node1 is before node2, and a positive number if
 * node2 is before node1.  Note that we compare the order the tags appear in the
 * document so in the tree <b><i>text</i></b> the B node is considered to be
 * before the I node.
 *
 * @param {Node} node1 The first node to compare.
 * @param {Node} node2 The second node to compare.
 * @return {number} 0 if the nodes are the same node, a negative number if node1
 *     is before node2, and a positive number if node2 is before node1.
 */
goog.dom.compareNodeOrder = function(node1, node2) {
  // Fall out quickly for equality.
  if (node1 == node2) {
    return 0;
  }

  // Use compareDocumentPosition where available
  if (node1.compareDocumentPosition) {
    // 4 is the bitmask for FOLLOWS.
    return node1.compareDocumentPosition(node2) & 2 ? 1 : -1;
  }

  // Process in IE using sourceIndex - we check to see if the first node has
  // a source index or if it's parent has one.
  if ('sourceIndex' in node1 ||
      (node1.parentNode && 'sourceIndex' in node1.parentNode)) {
    var isElement1 = node1.nodeType == goog.dom.NodeType.ELEMENT;
    var isElement2 = node2.nodeType == goog.dom.NodeType.ELEMENT;

    if (isElement1 && isElement2) {
      return node1.sourceIndex - node2.sourceIndex;
    } else {
      var parent1 = node1.parentNode;
      var parent2 = node2.parentNode;

      if (parent1 == parent2) {
        return goog.dom.compareSiblingOrder_(node1, node2);
      }

      if (!isElement1 && goog.dom.contains(parent1, node2)) {
        return -1 * goog.dom.compareParentsDescendantNodeIe_(node1, node2);
      }


      if (!isElement2 && goog.dom.contains(parent2, node1)) {
        return goog.dom.compareParentsDescendantNodeIe_(node2, node1);
      }

      return (isElement1 ? node1.sourceIndex : parent1.sourceIndex) -
             (isElement2 ? node2.sourceIndex : parent2.sourceIndex);
    }
  }

  // For Safari, we compare ranges.
  var doc = goog.dom.getOwnerDocument(node1);

  var range1, range2;
  range1 = doc.createRange();
  range1.selectNode(node1);
  range1.collapse(true);

  range2 = doc.createRange();
  range2.selectNode(node2);
  range2.collapse(true);

  return range1.compareBoundaryPoints(goog.global['Range'].START_TO_END,
      range2);
};


/**
 * Utility function to compare the position of two nodes, when
 * {@code textNode}'s parent is an ancestor of {@code node}.  If this entry
 * condition is not met, this function will attempt to reference a null object.
 * @param {Node} textNode The textNode to compare.
 * @param {Node} node The node to compare.
 * @return {number} -1 if node is before textNode, +1 otherwise.
 * @private
 */
goog.dom.compareParentsDescendantNodeIe_ = function(textNode, node) {
  var parent = textNode.parentNode;
  if (parent == node) {
    // If textNode is a child of node, then node comes first.
    return -1;
  }
  var sibling = node;
  while (sibling.parentNode != parent) {
    sibling = sibling.parentNode;
  }
  return goog.dom.compareSiblingOrder_(sibling, textNode);
};


/**
 * Utility function to compare the position of two nodes known to be non-equal
 * siblings.
 * @param {Node} node1 The first node to compare.
 * @param {Node} node2 The second node to compare.
 * @return {number} -1 if node1 is before node2, +1 otherwise.
 * @private
 */
goog.dom.compareSiblingOrder_ = function(node1, node2) {
  var s = node2;
  while ((s = s.previousSibling)) {
    if (s == node1) {
      // We just found node1 before node2.
      return -1;
    }
  }

  // Since we didn't find it, node1 must be after node2.
  return 1;
};


/**
 * Find the deepest common ancestor of the given nodes.
 * @param {Node} var_args The nodes to find a common ancestor of.
 * @return {Node?} The common ancestor of the nodes, or null if there is none.
 *     null will only be returned if two or more of the nodes are from different
 *     documents.
 */
goog.dom.findCommonAncestor = function(var_args) {
  var i, count = arguments.length;
  if (!count) {
    return null;
  } else if (count == 1) {
    return arguments[0];
  }

  var paths = [];
  var minLength = Infinity;
  for (i = 0; i < count; i++) {
    // Compute the list of ancestors.
    var ancestors = [];
    var node = arguments[i];
    while (node) {
      ancestors.unshift(node);
      node = node.parentNode;
    }

    // Save the list for comparison.
    paths.push(ancestors);
    minLength = Math.min(minLength, ancestors.length);
  }
  var output = null;
  for (i = 0; i < minLength; i++) {
    var first = paths[0][i];
    for (var j = 1; j < count; j++) {
      if (first != paths[j][i]) {
        return output;
      }
    }
    output = first;
  }
  return output;
};


/**
 * Returns the owner document for a node.
 * @param {Node} node The node to get the document for.
 * @return {!Document} The document owning the node.
 */
goog.dom.getOwnerDocument = function(node) {
  // IE5 uses document instead of ownerDocument
  return node.nodeType == goog.dom.NodeType.DOCUMENT ?
           /** @type {Document} */ (node) :
           node.ownerDocument || node.document;
};


/**
 * Cross-browser function for getting the document element of a frame or iframe.
 * @param {HTMLIFrameElement|HTMLFrameElement} frame Frame element.
 * @return {!Document} The frame content document.
 */
goog.dom.getFrameContentDocument = function(frame) {
  var doc;
  if (goog.userAgent.WEBKIT) {
    doc = (frame.document || frame.contentWindow.document);
  } else {
    doc = (frame.contentDocument || frame.contentWindow.document);
  }
  return doc;
};


/**
 * Cross-browser function for getting the window of a frame or iframe.
 * @param {HTMLIFrameElement|HTMLFrameElement} frame Frame element.
 * @return {!Window} The window associated with the given frame.
 */
goog.dom.getFrameContentWindow = function(frame) {
  return frame.contentWindow ||
      goog.dom.getWindow(goog.dom.getFrameContentDocument(frame));
};


/**
 * Cross-browser function for setting the text content of an element.
 * @param {Element} element The element to change the text content of.
 * @param {string} text The string that should replace the current element
 *     content.
 */
goog.dom.setTextContent = function(element, text) {
  if ('textContent' in element) {
    element.textContent = text;
  } else if (element.firstChild &&
             element.firstChild.nodeType == goog.dom.NodeType.TEXT) {
    // If the first child is a text node we just change its data and remove the
    // rest of the children.
    while (element.lastChild != element.firstChild) {
      element.removeChild(element.lastChild);
    }
    element.firstChild.data = text;
  } else {
    goog.dom.removeChildren(element);
    var doc = goog.dom.getOwnerDocument(element);
    element.appendChild(doc.createTextNode(text));
  }
};


/**
 * Gets the outerHTML of a node, which islike innerHTML, except that it
 * actually contains the HTML of the node itself.
 * @param {Element} element The element to get the HTML of.
 * @return {string} The outerHTML of the given element.
 */
goog.dom.getOuterHtml = function(element) {
  // IE, Opera and WebKit all have outerHTML.
  if ('outerHTML' in element) {
    return element.outerHTML;
  } else {
    var doc = goog.dom.getOwnerDocument(element);
    var div = doc.createElement('div');
    div.appendChild(element.cloneNode(true));
    return div.innerHTML;
  }
};


/**
 * Finds the first descendant node that matches the filter function, using
 * a depth first search. This function offers the most general purpose way
 * of finding a matching element. You may also wish to consider
 * {@code goog.dom.query} which can express many matching criteria using
 * CSS selector expressions. These expressions often result in a more
 * compact representation of the desired result.
 * @see goog.dom.query
 *
 * @param {Node} root The root of the tree to search.
 * @param {function(Node) : boolean} p The filter function.
 * @return {Node|undefined} The found node or undefined if none is found.
 */
goog.dom.findNode = function(root, p) {
  var rv = [];
  goog.dom.findNodes_(root, p, rv, true);
  return rv.length ? rv[0] : undefined;
};


/**
 * Finds all the descendant nodes that match the filter function, using a
 * a depth first search. This function offers the most general-purpose way
 * of finding a set of matching elements. You may also wish to consider
 * {@code goog.dom.query} which can express many matching criteria using
 * CSS selector expressions. These expressions often result in a more
 * compact representation of the desired result.

 * @param {Node} root The root of the tree to search.
 * @param {function(Node) : boolean} p The filter function.
 * @return {Array.<Node>} The found nodes or an empty array if none are found.
 */
goog.dom.findNodes = function(root, p) {
  var rv = [];
  goog.dom.findNodes_(root, p, rv, false);
  return rv;
};


/**
 * Finds the first or all the descendant nodes that match the filter function,
 * using a depth first search.
 * @param {Node?} root The root of the tree to search.
 * @param {function(Node) : boolean} p The filter function.
 * @param {Array.<Node>} rv The found nodes are added to this array.
 * @param {boolean} findOne If true we exit after the first found node.
 * @private
 */
goog.dom.findNodes_ = function(root, p, rv, findOne) {
  if (root != null) {
    for (var i = 0, child; child = root.childNodes[i]; i++) {
      if (p(child)) {
        rv.push(child);
        if (findOne) {
          return;
        }
      }
      goog.dom.findNodes_(child, p, rv, findOne);
    }
  }
};


/**
 * Map of tags whose content to ignore when calculating text length.
 * @type {Object}
 * @private
 */
goog.dom.TAGS_TO_IGNORE_ = {
  'SCRIPT': 1,
  'STYLE': 1,
  'HEAD': 1,
  'IFRAME': 1,
  'OBJECT': 1
};


/**
 * Map of tags which have predefined values with regard to whitespace.
 * @type {Object}
 * @private
 */
goog.dom.PREDEFINED_TAG_VALUES_ = {'IMG': ' ', 'BR': '\n'};


/**
 * Returns true if the element has a tab index that allows it to receive
 * keyboard focus (tabIndex >= 0), false otherwise.  Note that form elements
 * natively support keyboard focus, even if they have no tab index.  See
 * http://go/tabindex for more info.
 * @param {Element} element Element to check.
 * @return {boolean} Whether the element has a tab index that allows keyboard
 *     focus.
 */
goog.dom.isFocusableTabIndex = function(element) {
  // IE returns 0 for an unset tabIndex, so we must use getAttributeNode(),
  // which returns an object with a 'specified' property if tabIndex is
  // specified.  This works on other browsers, too.
  var attrNode = element.getAttributeNode('tabindex'); // Must be lowercase!
  if (attrNode && attrNode.specified) {
    var index = element.tabIndex;
    return goog.isNumber(index) && index >= 0;
  }
  return false;
};


/**
 * Enables or disables keyboard focus support on the element via its tab index.
 * Only elements for which {@link goog.dom.isFocusableTabIndex} returns true
 * (or elements that natively support keyboard focus, like form elements) can
 * receive keyboard focus.  See http://go/tabindex for more info.
 * @param {Element} element Element whose tab index is to be changed.
 * @param {boolean} enable Whether to set or remove a tab index on the element
 *     that supports keyboard focus.
 */
goog.dom.setFocusableTabIndex = function(element, enable) {
  if (enable) {
    element.tabIndex = 0;
  } else {
    element.removeAttribute('tabIndex'); // Must be camelCase!
  }
};


/**
 * Returns the text content of the current node, without markup and invisible
 * symbols. New lines are stripped and whitespace is collapsed,
 * such that each character would be visible.
 *
 * In browsers that support it, innerText is used.  Other browsers attempt to
 * simulate it via node traversal.  Line breaks are canonicalized in IE.
 *
 * @param {Node} node The node from which we are getting content.
 * @return {string} The text content.
 */
goog.dom.getTextContent = function(node) {
  var textContent;
  // Note(arv): Both Opera and Safara 3 supports innerText but they include
  // text nodes in script tags. So we revert to use a user agent test here.
  if (goog.userAgent.IE && ('innerText' in node)) {
    textContent = goog.string.canonicalizeNewlines(node.innerText);
    // Unfortunately .innerText() returns text with &shy; symbols
    // We need to filter it out and then remove duplicate whitespaces
  } else {
    var buf = [];
    goog.dom.getTextContent_(node, buf, true);
    textContent = buf.join('');
  }

  // Strip &shy; entities. goog.format.insertWordBreaks inserts them in Opera.
  textContent = textContent.replace(/\xAD/g, '');

  textContent = textContent.replace(/ +/g, ' ');
  if (textContent != ' ') {
    textContent = textContent.replace(/^\s*/, '');
  }

  return textContent;
};


/**
 * Returns the text content of the current node, without markup.
 *
 * Unlike {@code getTextContent} this method does not collapse whitespaces
 * or normalize lines breaks.
 *
 * @param {Node} node The node from which we are getting content.
 * @return {string} The raw text content.
 */
goog.dom.getRawTextContent = function(node) {
  var buf = [];
  goog.dom.getTextContent_(node, buf, false);

  return buf.join('');
};


/**
 * Recursive support function for text content retrieval.
 *
 * @param {Node} node The node from which we are getting content.
 * @param {Array} buf string buffer.
 * @param {boolean} normalizeWhitespace Whether to normalize whitespace.
 * @private
 */
goog.dom.getTextContent_ = function(node, buf, normalizeWhitespace) {
  if (node.nodeName in goog.dom.TAGS_TO_IGNORE_) {
    // ignore certain tags
  } else if (node.nodeType == goog.dom.NodeType.TEXT) {
    if (normalizeWhitespace) {
      buf.push(String(node.nodeValue).replace(/(\r\n|\r|\n)/g, ''));
    } else {
      buf.push(node.nodeValue);
    }
  } else if (node.nodeName in goog.dom.PREDEFINED_TAG_VALUES_) {
    buf.push(goog.dom.PREDEFINED_TAG_VALUES_[node.nodeName]);
  } else {
    var child = node.firstChild;
    while (child) {
      goog.dom.getTextContent_(child, buf, normalizeWhitespace);
      child = child.nextSibling;
    }
  }
};


/**
 * Returns the text length of the text contained in a node, without markup. This
 * is equivalent to the selection length if the node was selected, or the number
 * of cursor movements to traverse the node. Images & BRs take one space.  New
 * lines are ignored.
 *
 * @param {Node} node The node whose text content length is being calculated.
 * @return {number} The length of {@code node}'s text content.
 */
goog.dom.getNodeTextLength = function(node) {
  return goog.dom.getTextContent(node).length;
};


/**
 * Returns the text offset of a node relative to one of its ancestors. The text
 * length is the same as the length calculated by goog.dom.getNodeTextLength.
 *
 * @param {Node} node The node whose offset is being calculated.
 * @param {Node} opt_offsetParent The node relative to which the offset will
 *     be calculated. Defaults to the node's owner document's body.
 * @return {number} The text offset.
 */
goog.dom.getNodeTextOffset = function(node, opt_offsetParent) {
  var root = opt_offsetParent || goog.dom.getOwnerDocument(node).body;
  var buf = [];
  while (node && node != root) {
    var cur = node;
    while ((cur = cur.previousSibling)) {
      buf.unshift(goog.dom.getTextContent(cur));
    }
    node = node.parentNode;
  }
  // Trim left to deal with FF cases when there might be line breaks and empty
  // nodes at the front of the text
  return goog.string.trimLeft(buf.join('')).replace(/ +/g, ' ').length;
};


/**
 * Returns the node at a given offset in a parent node.  If an object is
 * provided for the optional third parameter, the node and the remainder of the
 * offset will stored as properties of this object.
 * @param {Node} parent The parent node.
 * @param {number} offset The offset into the parent node.
 * @param {Object} opt_result Object to be used to store the return value. The
 *     return value will be stored in the form {node: Node, remainder: number}
 *     if this object is provided.
 * @return {Node} The node at the given offset.
 */
goog.dom.getNodeAtOffset = function(parent, offset, opt_result) {
  var stack = [parent], pos = 0, cur;
  while (stack.length > 0 && pos < offset) {
    cur = stack.pop();
    if (cur.nodeName in goog.dom.TAGS_TO_IGNORE_) {
      // ignore certain tags
    } else if (cur.nodeType == goog.dom.NodeType.TEXT) {
      var text = cur.nodeValue.replace(/(\r\n|\r|\n)/g, '').replace(/ +/g, ' ');
      pos += text.length;
    } else if (cur.nodeName in goog.dom.PREDEFINED_TAG_VALUES_) {
      pos += goog.dom.PREDEFINED_TAG_VALUES_[cur.nodeName].length;
    } else {
      for (var i = cur.childNodes.length - 1; i >= 0; i--) {
        stack.push(cur.childNodes[i]);
      }
    }
  }
  if (goog.isObject(opt_result)) {
    opt_result.remainder = cur ? cur.nodeValue.length + offset - pos - 1 : 0;
    opt_result.node = cur;
  }

  return cur;
};


/**
 * Returns true if the object is a {@code NodeList}.  To qualify as a NodeList,
 * the object must have a numeric length property and an item function (which
 * has type 'string' on IE for some reason).
 * @param {Object?} val Object to test.
 * @return {boolean} Whether the object is a NodeList.
 */
goog.dom.isNodeList = function(val) {
  // A NodeList must have a length property of type 'number' on all platforms.
  if (val && typeof val.length == 'number') {
    // A NodeList is an object everywhere except Safari, where it's a function.
    if (goog.isObject(val)) {
      // A NodeList must have an item function (on non-IE platforms) or an item
      // property of type 'string' (on IE).
      return typeof val.item == 'function' || typeof val.item == 'string';
    } else if (goog.isFunction(val)) {
      // On Safari, a NodeList is a function with an item property that is also
      // a function.
      return typeof val.item == 'function';
    }
  }

  // Not a NodeList.
  return false;
};


/**
 * Walks up the DOM hierarchy returning the first ancestor that has the passed
 * tag name and/or class name. If the passed element matches the specified
 * criteria, the element itself is returned.
 * @param {Node} element The DOM node to start with.
 * @param {?string} opt_tag The tag name to match (or null/undefined to match
 *     any node regardless of tag name). Must be uppercase (goog.dom.TagName).
 * @param {?string} opt_class The class name to match (or null/undefined to
 *     match any node regardless of class name).
 * @return {Node?} The first ancestor that matches the passed criteria, or
 *     null if none match.
 */
goog.dom.getAncestorByTagNameAndClass = function(element, opt_tag, opt_class) {
  return goog.dom.getAncestor(element,
      function(node) {
        return (!opt_tag || node.nodeName == opt_tag) &&
               (!opt_class || goog.dom.classes.has(node, opt_class));
      }, true);
};


/**
 * Walks up the DOM hierarchy returning the first ancestor that passes the
 * matcher function.
 * @param {Node} element The DOM node to start with.
 * @param {function(Node) : boolean} matcher A function that returns true if the
 *     passed node matches the desired criteria.
 * @param {boolean} opt_includeNode If true, the node itself is included in
 *     the search (the first call to the matcher will pass startElement as
 *     the node to test).
 * @param {number} opt_maxSearchSteps Maximum number of levels to search up the
 *     dom.
 * @return {Node?} DOM node that matched the matcher, or null if there was
 *     no match.
 */
goog.dom.getAncestor = function(
    element, matcher, opt_includeNode, opt_maxSearchSteps) {
  if (!opt_includeNode) {
    element = element.parentNode;
  }
  var ignoreSearchSteps = opt_maxSearchSteps == null;
  var steps = 0;
  while (element && (ignoreSearchSteps || steps <= opt_maxSearchSteps)) {
    if (matcher(element)) {
      return element;
    }
    element = element.parentNode;
    steps++;
  }
  // Reached the root of the DOM without a match
  return null;
};


/**
 * Create an instance of a DOM helper with a new document object.
 * @param {Document} opt_document Document object to associate with this
 *     DOM helper.
 * @constructor
 */
goog.dom.DomHelper = function(opt_document) {
  /**
   * Reference to the document object to use
   * @type {!Document}
   */
  this.document_ = opt_document || goog.global.document || document;
};


/**
 * Gets the dom helper object for the document where the element resides.
 * @param {Element} opt_element If present, gets the DomHelper for this element.
 * @return {!goog.dom.DomHelper} The DomHelper.
 */
goog.dom.DomHelper.prototype.getDomHelper = goog.dom.getDomHelper;


/**
 * Sets the document object.
 * @param {!Document} document Document object.
 */
goog.dom.DomHelper.prototype.setDocument = function(document) {
  this.document_ = document;
};


/**
 * Gets the document object being used by the dom library.
 * @return {!Document} Document object.
 */
goog.dom.DomHelper.prototype.getDocument = function() {
  return this.document_;
};


/**
 * Alias for {@code getElementById}. If a DOM node is passed in then we just
 * return that.
 * @param {string|Element} element Element ID or a DOM node.
 * @return {Element} The element with the given ID, or the node passed in.
 */
goog.dom.DomHelper.prototype.getElement = function(element) {
  if (goog.isString(element)) {
    return this.document_.getElementById(element);
  } else {
    return element;
  }
};


/**
 * Alias for {@code getElement}.
 * @param {string|Element} element Element ID or a DOM node.
 * @return {Element} The element with the given ID, or the node passed in.
 */
goog.dom.DomHelper.prototype.$ = goog.dom.DomHelper.prototype.getElement;


/**
 * Looks up elements by both tag and class name, using browser native functions
 * ({@code querySelectorAll}, {@code getElementsByTagName} or
 * {@code getElementsByClassName}) where possible. The returned array is a live
 * NodeList or a static list depending on the code path taken.
 *
 * @see goog.dom.query
 *
 * @param {?string} opt_tag Element tag name or * for all tags.
 * @param {?string} opt_class Optional class name.
 * @param {Element} opt_el Optional element to look in.
 * @return {Array.<Element>|NodeList} Array-like list of elements (only a length
 *     property and numerical indices are guaranteed to exist).
 */
goog.dom.DomHelper.prototype.getElementsByTagNameAndClass = function(opt_tag,
                                                                     opt_class,
                                                                     opt_el) {
  var parent = opt_el || this.document_;
  var tagName = (opt_tag && opt_tag != '*') ? opt_tag.toLowerCase() : '';

  // Prefer the standardized (http://www.w3.org/TR/selectors-api/), native and
  // fast W3C Selectors API. However, the version of WebKit that shipped with
  // Safari 3.1 and Chrome has a bug where it will not correctly match mixed-
  // case class name selectors in quirks mode.
  if (parent.querySelectorAll &&
      (tagName || opt_class) &&
      (!goog.userAgent.WEBKIT || this.isCss1CompatMode() ||
        goog.userAgent.isVersion('528'))) {
    var query = tagName + (opt_class ? '.' + opt_class : '');
    var nodeList = parent.querySelectorAll(query);
    // IE 8 doesn't handle out of bounds accesses on the returned node list
    // correctly (it throws an exception instead of returning undefined), so
    // convert the returned value to an array to be consistent with other
    // browsers.
    if (goog.userAgent.IE && goog.userAgent.isVersion('8')) {
      return goog.array.toArray(nodeList);
    } else {
      return nodeList;
    }
  }

  // Use the native getElementsByClassName if available, under the assumption
  // that even when the tag name is specified, there will be fewer elements to
  // filter through when going by class than by tag name
  if (opt_class && parent.getElementsByClassName) {
    var els = parent.getElementsByClassName(opt_class);

    if (tagName) {
      var rv = [];

      // Filter for specific tags if requested.
      for (var i = 0, el; el = els[i]; i++) {
        if (tagName == el.nodeName.toLowerCase()) {
          rv.push(el);
        }
      }

      return rv;
    } else {
      return els;
    }
  }

  var els = parent.getElementsByTagName(tagName || '*');

  if (opt_class) {
    var rv = [];
    for (var i = 0, el; el = els[i]; i++) {
      var className = el.className;
      // Check if className has a split function since SVG className does not.
      if (typeof className.split == 'function' &&
          goog.array.contains(className.split(' '), opt_class)) {
        rv.push(el);
      }
    }
    return rv;
  } else {
    return els;
  }
};


/**
 * Alias for {@code getElementsByTagNameAndClass}.
 * @deprecated Use goog.dom.getElementsByTagNameAndClass.
 * @see goog.dom.query
 *
 * @param {string} opt_tag Element tag name.
 * @param {string?} opt_class Optional class name.
 * @param {Element} opt_el Optional element to look in.
 * @return {Array.<Element>|NodeList} Array-like list of elements (only a length
 *     property and numerical indices are guaranteed to exist).
 */
goog.dom.DomHelper.prototype.$$ =
    goog.dom.DomHelper.prototype.getElementsByTagNameAndClass;


/**
 * Sets a number of properties on a node.
 * @param {Element} element DOM node to set properties on.
 * @param {Object} properties Hash of property:value pairs.
 */
goog.dom.DomHelper.prototype.setProperties = goog.dom.setProperties;


/**
 * Gets the dimensions of the viewport.
 * @param {Window} opt_window Optional window element to test. Defaults to
 *     the window of the Dom Helper.
 * @return {!goog.math.Size} Object with values 'w' and 'h'.
 */
goog.dom.DomHelper.prototype.getViewportSize = function(opt_window) {
  return goog.dom.getViewportSize(opt_window || this.getWindow());
};


/**
 * Returns a dom node with a set of attributes.  This function accepts varargs
 * for subsequent nodes to be added.  Subsequent nodes will be added to the
 * first node as childNodes.
 *
 * So:
 * <code>createDom('div', null, createDom('p'), createDom('p'));</code>
 * would return a div with two child paragraphs
 *
 * An easy way to move all child nodes of an existing element to a new parent
 * element is:
 * <code>createDom('div', null, oldElement.childNodes);</code>
 * which will remove all child nodes from the old element and add them as
 * child nodes of the new DIV.
 *
 * @param {string} tagName Tag to create.
 * @param {Object?} opt_attributes Map of name-value pairs for attributes.
 * @param {Object|string|Array|NodeList} var_args Further DOM nodes or strings
 *     for text nodes. If one of the var_args is an array or NodeList, its
 *     elements will be added as childNodes instead.
 * @return {!Element} Reference to a DOM node.
 */
goog.dom.DomHelper.prototype.createDom = function(tagName,
                                                  opt_attributes,
                                                  var_args) {

  // Internet Explorer is dumb: http://msdn.microsoft.com/workshop/author/
  //                            dhtml/reference/properties/name_2.asp
  // Also does not allow setting of 'type' attribute on 'input' or 'button'.
  if (goog.userAgent.IE && opt_attributes &&
      (opt_attributes.name || opt_attributes.type)) {
    var tagNameArr = ['<', tagName];
    if (opt_attributes.name) {
      tagNameArr.push(' name="', goog.string.htmlEscape(opt_attributes.name),
                      '"');
    }
    if (opt_attributes.type) {
      tagNameArr.push(' type="', goog.string.htmlEscape(opt_attributes.type),
                      '"');
      // Create copy of attribute map to remove 'type' without mutating argument
      opt_attributes = goog.cloneObject(opt_attributes);
      delete opt_attributes.type;
    }
    tagNameArr.push('>');
    tagName = tagNameArr.join('');
  }

  var element = this.createElement(tagName);

  if (opt_attributes) {
    goog.dom.setProperties(element, opt_attributes);
  }

  if (arguments.length > 2) {
    function childHandler(child) {
      if (child) {
        this.appendChild(element, goog.isString(child) ?
            this.createTextNode(child) : child);
      }
    }

    for (var i = 2; i < arguments.length; i++) {
      var arg = arguments[i];
      if (goog.isArrayLike(arg) && !goog.dom.isNodeLike(arg)) {
        // If the argument is a node list, not a real array, use a clone,
        // because forEach can't be used to mutate a NodeList.
        goog.array.forEach(goog.dom.isNodeList(arg) ?
            goog.array.clone(arg) : arg,
            childHandler, this);
      } else {
        childHandler.call(this, arg);
      }
    }
  }

  return element;
};


/**
 * Alias for {@code createDom}.
 * @param {string} tagName Tag to create.
 * @param {Object?} opt_attributes Map of name-value pairs for attributes.
 * @param {Object|Array} var_args Further DOM nodes or strings for text nodes.
 *     If one of the var_args is an array, its children will be added as
 *     childNodes instead.
 * @return {!Element} Reference to a DOM node.
 */
goog.dom.DomHelper.prototype.$dom = goog.dom.DomHelper.prototype.createDom;


/**
 * Creates a new element.
 * @param {string} name Tag name.
 * @return {!Element} The new element.
 */
goog.dom.DomHelper.prototype.createElement = function(name) {
  return this.document_.createElement(name);
};


/**
 * Creates a new text node.
 * @param {string} content Content.
 * @return {!Text} The new text node.
 */
goog.dom.DomHelper.prototype.createTextNode = function(content) {
  return this.document_.createTextNode(content);
};


/**
 * Converts an HTML string into a node or a document fragment.  A single Node
 * is used if the {@code htmlString} only generates a single node.  If the
 * {@code htmlString} generates multiple nodes then these are put inside a
 * {@code DocumentFragment}.
 *
 * @param {string} htmlString The HTML string to convert.
 * @return {!Node} The resulting node.
 */
goog.dom.DomHelper.prototype.htmlToDocumentFragment = function(htmlString) {
  var tempDiv = this.document_.createElement('div');
  tempDiv.innerHTML = htmlString;
  if (tempDiv.childNodes.length == 1) {
    return /** @type {!Node} */ (tempDiv.firstChild);
  } else {
    var fragment = this.document_.createDocumentFragment();
    while (tempDiv.firstChild) {
      fragment.appendChild(tempDiv.firstChild);
    }
    return fragment;
  }
};


/**
 * Returns the compatMode of the document.
 * @return {string} The result is either CSS1Compat or BackCompat.
 * @deprecated use goog.dom.DomHelper.prototype.isCss1CompatMode instead.
 */
goog.dom.DomHelper.prototype.getCompatMode = function() {
  return this.isCss1CompatMode() ? 'CSS1Compat' : 'BackCompat';
};


/**
 * Returns true if the browser is in "CSS1-compatible" (standards-compliant)
 * mode, false otherwise.
 * @return {boolean} True if in CSS1-compatible mode.
 */
goog.dom.DomHelper.prototype.isCss1CompatMode = function() {
  if (goog.dom.COMPAT_MODE_KNOWN_) {
    return goog.dom.ASSUME_STANDARDS_MODE;
  }

  var doc = this.document_;
  if (doc.compatMode) {
    return doc.compatMode == 'CSS1Compat';
  }
  if (goog.userAgent.WEBKIT) {
    // Create a dummy div and set the width without a unit. This is invalid in
    // CSS but quirks mode allows it.
    var el = doc.createElement('div');
    el.style.cssText = 'position:absolute;width:0;height:0;width:1';
    var val = el.style.width == '1px' ? 'BackCompat' : 'CSS1Compat';
    // There is no way to change the compatMode after it has been set so we
    // set it here so that the next call is faster
    return (doc.compatMode = val) == 'CSS1Compat';
  }
  return false;
};


/**
 * Gets the window object associated with the document.
 * @return {!Window} The window associated with the given document.
 */
goog.dom.DomHelper.prototype.getWindow = function() {
  var doc = this.document_;
  if (doc.parentWindow) {
    return doc.parentWindow;
  }

  if (goog.userAgent.WEBKIT && !goog.userAgent.isVersion('500') &&
      !goog.userAgent.MOBILE) {
    // NOTE(arv): document.defaultView is a valid object under Safari 2, but
    // it's not a window object, it's an AbstractView object.  You can use it to
    // get computed CSS style, but it doesn't have the full functionality of a
    // DOM window.  So for Safari 2 we use the following hack:
    var scriptElement = doc.createElement('script');
    scriptElement.innerHTML = 'document.parentWindow=window';
    var parentElement = doc.documentElement;
    parentElement.appendChild(scriptElement);
    parentElement.removeChild(scriptElement);
    return doc.parentWindow;
  }
  return doc.defaultView;
};



/**
 * Gets the document scroll element.
 * @return {Element} Scrolling element.
 */
goog.dom.DomHelper.prototype.getDocumentScrollElement = function() {
  var doc = this.document_;
  // Safari (2 and 3) needs body.scrollLeft in both quirks mode and strict mode.
  return !goog.userAgent.WEBKIT && this.isCss1CompatMode() ?
      doc.documentElement : doc.body;
};


/**
 * Gets the document scroll distance as a coordinate object.
 * @return {!goog.math.Coordinate} Object with properties 'x' and 'y'.
 */
goog.dom.DomHelper.prototype.getDocumentScroll = function() {
  var el = this.getDocumentScrollElement();
  return new goog.math.Coordinate(el.scrollLeft, el.scrollTop);
};


/**
 * Appends a child to a node.
 * @param {Node} parent Parent.
 * @param {Node} child Child.
 */
goog.dom.DomHelper.prototype.appendChild = goog.dom.appendChild;


/**
 * Removes all the child nodes on a DOM node.
 * @param {Node} node Node to remove children from.
 */
goog.dom.DomHelper.prototype.removeChildren = goog.dom.removeChildren;


/**
 * Inserts a new node before an existing reference node (i.e., as the previous
 * sibling). If the reference node has no parent, then does nothing.
 * @param {Node} newNode Node to insert.
 * @param {Node} refNode Reference node to insert before.
 */
goog.dom.DomHelper.prototype.insertSiblingBefore = goog.dom.insertSiblingBefore;


/**
 * Inserts a new node after an existing reference node (i.e., as the next
 * sibling). If the reference node has no parent, then does nothing.
 * @param {Node} newNode Node to insert.
 * @param {Node} refNode Reference node to insert after.
 */
goog.dom.DomHelper.prototype.insertSiblingAfter = goog.dom.insertSiblingAfter;


/**
 * Removes a node from its parent.
 * @param {Node} node The node to remove.
 * @return {Node?} The node removed if removed; else, null.
 */
goog.dom.DomHelper.prototype.removeNode = goog.dom.removeNode;


/**
 * Replaces a node in the DOM tree. Will do nothing if {@code oldNode} has no
 * parent.
 * @param {Node} newNode Node to insert.
 * @param {Node} oldNode Node to replace.
 */
goog.dom.DomHelper.prototype.replaceNode = goog.dom.replaceNode;


/**
 * Flattens an element. That is, removes it and replace it with its children.
 * @param {Element} element The element to flatten.
 * @return {Element|undefined} The original element, detached from the document
 *     tree, sans children, or undefined if the element was already not in the
 *     document.
 */
goog.dom.DomHelper.prototype.flattenElement = goog.dom.flattenElement;


/**
 * Returns the first child node that is an element.
 * @param {Node} node The node to get the first child element of.
 * @return {Element} The first child node of {@code node} that is an element.
 */
goog.dom.DomHelper.prototype.getFirstElementChild =
    goog.dom.getFirstElementChild;


/**
 * Returns the last child node that is an element.
 * @param {Node} node The node to get the last child element of.
 * @return {Element} The last child node of {@code node} that is an element.
 */
goog.dom.DomHelper.prototype.getLastElementChild = goog.dom.getLastElementChild;


/**
 * Returns the first next sibling that is an element.
 * @param {Node} node The node to get the next sibling element of.
 * @return {Element} The next sibling of {@code node} that is an element.
 */
goog.dom.DomHelper.prototype.getNextElementSibling =
    goog.dom.getNextElementSibling;


/**
 * Returns the first previous sibling that is an element.
 * @param {Node} node The node to get the previous sibling element of.
 * @return {Element} The first previous sibling of {@code node} that is
 *     an element.
 */
goog.dom.DomHelper.prototype.getPreviousElementSibling =
    goog.dom.getPreviousElementSibling;


/**
 * Whether the object looks like a DOM node.
 * @param {Object} obj The object being tested for node likeness.
 * @return {boolean} Whether the object looks like a DOM node.
 */
goog.dom.DomHelper.prototype.isNodeLike = goog.dom.isNodeLike;


/**
 * Whether a node contains another node.
 * @param {Node} parent The node that should contain the other node.
 * @param {Node} descendant The node to test presence of.
 * @return {boolean} Whether the parent node contains the descendent node.
 */
goog.dom.DomHelper.prototype.contains = goog.dom.contains;


/**
 * Returns the owner document for a node.
 * @param {Node} node The node to get the document for.
 * @return {!Document} The document owning the node.
 */
goog.dom.DomHelper.prototype.getOwnerDocument = goog.dom.getOwnerDocument;


/**
 * Cross browser function for getting the document element of an iframe.
 * @param {HTMLIFrameElement|HTMLFrameElement} iframe Iframe element.
 * @return {!HTMLDocument} The frame content document.
 */
goog.dom.DomHelper.prototype.getFrameContentDocument =
    goog.dom.getFrameContentDocument;


/**
 * Cross browser function for getting the window of a frame or iframe.
 * @param {HTMLIFrameElement|HTMLFrameElement} frame Frame element.
 * @return {!Window} The window associated with the given frame.
 */
goog.dom.DomHelper.prototype.getFrameContentWindow =
    goog.dom.getFrameContentWindow;


/**
 * Cross browser function for setting the text content of an element.
 * @param {Element} element The element to change the text content of.
 * @param {string} text The string that should replace the current element
 *     content with.
 */
goog.dom.DomHelper.prototype.setTextContent = goog.dom.setTextContent;


/**
 * Finds the first descendant node that matches the filter function. This does
 * a depth first search.
 * @param {Node} root The root of the tree to search.
 * @param {function(Node) : boolean} p The filter function.
 * @return {(Node, undefined)} The found node or undefined if none is found.
 */
goog.dom.DomHelper.prototype.findNode = goog.dom.findNode;


/**
 * Finds all the descendant nodes that matches the filter function. This does a
 * depth first search.
 * @param {Node} root The root of the tree to search.
 * @param {function(Node) : boolean} p The filter function.
 * @return {Array.<Node>} The found nodes or an empty array if none are found.
 */
goog.dom.DomHelper.prototype.findNodes = goog.dom.findNodes;


/**
 * Returns the text contents of the current node, without markup. New lines are
 * stripped and whitespace is collapsed, such that each character would be
 * visible.
 *
 * In browsers that support it, innerText is used.  Other browsers attempt to
 * simulate it via node traversal.  Line breaks are canonicalized in IE.
 *
 * @param {Node} node The node from which we are getting content.
 * @return {string} The text content.
 */
goog.dom.DomHelper.prototype.getTextContent = goog.dom.getTextContent;


/**
 * Returns the text length of the text contained in a node, without markup. This
 * is equivalent to the selection length if the node was selected, or the number
 * of cursor movements to traverse the node. Images & BRs take one space.  New
 * lines are ignored.
 *
 * @param {Node} node The node whose text content length is being calculated.
 * @return {number} The length of {@code node}'s text content.
 */
goog.dom.DomHelper.prototype.getNodeTextLength = goog.dom.getNodeTextLength;


/**
 * Returns the text offset of a node relative to one of its ancestors. The text
 * length is the same as the length calculated by
 * {@code goog.dom.getNodeTextLength}.
 *
 * @param {Node} node The node whose offset is being calculated.
 * @param {Node} opt_offsetParent Defaults to the node's owner document's body.
 * @return {number} The text offset.
 */
goog.dom.DomHelper.prototype.getNodeTextOffset = goog.dom.getNodeTextOffset;


/**
 * Walks up the DOM hierarchy returning the first ancestor that has the passed
 * tag name and/or class name. If the passed element matches the specified
 * criteria, the element itself is returned.
 * @param {Node} element The DOM node to start with.
 * @param {?string} opt_tag The tag name to match (or null/undefined to match
 *     any node regardless of tag name). Must be uppercase (goog.dom.TagName).
 * @param {?string} opt_class The class name to match (or null/undefined to
 *     match any node regardless of class name).
 * @return {Node?} The first ancestor that matches the passed criteria, or
 *     null if none match.
 */
goog.dom.DomHelper.prototype.getAncestorByTagNameAndClass =
    goog.dom.getAncestorByTagNameAndClass;


/**
 * Walks up the DOM hierarchy returning the first ancestor that passes the
 * matcher function.
 * @param {Node} element The DOM node to start with.
 * @param {function(Node) : boolean} matcher A function that returns true if the
 *     passed node matches the desired criteria.
 * @param {boolean} opt_includeNode If true, the node itself is included in
 *     the search (the first call to the matcher will pass startElement as
 *     the node to test).
 * @return {Node?} DOM node that matched the matcher, or null if there was
 *     no match.
 */
goog.dom.DomHelper.prototype.getAncestor = goog.dom.getAncestor;

// Copyright 2006 Google Inc.
// All Rights Reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 
//  * Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
//  * Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in
//    the documentation and/or other materials provided with the
//    distribution.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
// INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
// BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
// LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
// ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE. 

/**
 * @fileoverview Utilities for element styles.
 *
 */

goog.provide('goog.style');


goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.math.Box');
goog.require('goog.math.Coordinate');
goog.require('goog.math.Rect');
goog.require('goog.math.Size');
goog.require('goog.object');
goog.require('goog.userAgent');
goog.require('goog.userAgent.product');


/**
 * Sets a style value on an element.
 * @param {Element} element The element to change.
 * @param {string|Object} style If a string, a style name. If an object, a hash
 *     of style names to style values.
 * @param {string} opt_value If style was a string, then this should be the
 *     value.
 */
goog.style.setStyle = function(element, style, opt_value) {
  if (goog.isString(style)) {
    goog.style.setStyle_(element, opt_value, style);
  } else {
    goog.object.forEach(style, goog.partial(goog.style.setStyle_, element));
  }
};


/**
 * Sets a style value on an element, with parameters swapped to work with
 * {@code goog.object.forEach()}.
 * @param {Element} element The element to change.
 * @param {string} value Style value.
 * @param {string} style Style name.
 * @private
 */
goog.style.setStyle_ = function(element, value, style) {
  element.style[goog.style.toCamelCase(style)] = value;
};


/**
 * Retrieves an explicitly-set style value of a node. This returns '' if there
 * isn't a style attribute on the element or if this style property has not been
 * explicitly set in script.
 *
 * @param {Element} element Element to get style of.
 * @param {string} style Property to get, css-style (if you have a camel-case
 * property, use element.style[style]).
 * @return {string} Style value.
 */
goog.style.getStyle = function(element, style) {
  return element.style[goog.style.toCamelCase(style)];
};


/**
 * Retrieves a computed style value of a node, or null if the value cannot be
 * computed (which will be the case in Internet Explorer).
 *
 * @param {Element} element Element to get style of.
 * @param {string} style Property to get (camel-case).
 * @return {string?} Style value.
 */
goog.style.getComputedStyle = function(element, style) {
  var doc = goog.dom.getOwnerDocument(element);
  if (doc.defaultView && doc.defaultView.getComputedStyle) {
    var styles = doc.defaultView.getComputedStyle(element, '');
    if (styles) {
      return styles[style];
    }
  }

  return null;
};


/**
 * Gets the cascaded style value of a node, or null if the value cannot be
 * computed (only Internet Explorer can do this).
 *
 * @param {Element} element Element to get style of.
 * @param {string} style Property to get (camel-case).
 * @return {string} Style value.
 */
goog.style.getCascadedStyle = function(element, style) {
  return element.currentStyle ? element.currentStyle[style] : null;
};


/**
 * Cross-browser pseudo get computed style. It returns the computed style where
 * available. If not available it tries the cascaded style value (IE
 * currentStyle) and in worst case the inline style value.  It shouldn't be
 * called directly, see http://wiki/Main/ComputedStyleVsCascadedStyle for
 * discussion.
 *
 * @param {Element} element Element to get style of.
 * @param {string} style Property to get (must be camelCase, not css-style.).
 * @return {string} Style value.
 * @private
 */
goog.style.getStyle_ = function(element, style) {
  return goog.style.getComputedStyle(element, style) ||
         goog.style.getCascadedStyle(element, style) ||
         element.style[style];
};


/**
 * Retrieves the computed value of the position CSS attribute.
 * @param {Element} element The element to get the position of.
 * @return {string} Position value.
 */
goog.style.getComputedPosition = function(element) {
  return goog.style.getStyle_(element, 'position');
};


/**
 * Retrieves the computed background color string for a given element. The
 * string returned is suitable for assigning to another element's
 * background-color, but is not guaranteed to be in any particular string
 * format. Accessing the color in a numeric form may not be possible in all
 * browsers or with all input.
 *
 * If the background color for the element is defined as a hexadecimal value,
 * the resulting string can be parsed by goog.color.parse in all supported
 * browsers.
 *
 * Whether named colors like "red" or "lightblue" get translated into a
 * format which can be parsed is browser dependent. Calling this function on
 * transparent elements will return "transparent" in most browsers or
 * "rgba(0, 0, 0, 0)" in Safari.
 * @param {Element} element The element to get the background color of.
 * @return {string} The computed string value of the background color.
 */
goog.style.getBackgroundColor = function(element) {
  return goog.style.getStyle_(element, 'backgroundColor');
};


/**
 * Sets the top/left values of an element.  If no unit is specified in the
 * argument then it will add px.
 * @param {Element} el Element to move.
 * @param {string|number|goog.math.Coordinate} arg1 Left position or coordinate.
 * @param {string|number} opt_arg2 Top position.
 */
goog.style.setPosition = function(el, arg1, opt_arg2) {
  var x, y;
  var buggyGeckoSubPixelPos = goog.userAgent.GECKO && goog.userAgent.MAC &&
      goog.userAgent.isVersion('1.9');

  if (arg1 instanceof goog.math.Coordinate) {
    x = arg1.x;
    y = arg1.y;
  } else {
    x = arg1;
    y = opt_arg2;
  }

  el.style.left = typeof x == 'number' ?
      (buggyGeckoSubPixelPos ? Math.round(x) : x) + 'px' :
      /** @type {string} */ (x);
  el.style.top = typeof y == 'number' ?
      (buggyGeckoSubPixelPos ? Math.round(y) : y) + 'px' :
      /** @type {string} */ (y);
};


/**
 * Gets the offsetLeft and offsetTop properties of an element and returns them
 * in a Coordinate object
 * @param {Element} element Element.
 * @return {goog.math.Coordinate} The position.
 */
goog.style.getPosition = function(element) {
  return new goog.math.Coordinate(element.offsetLeft, element.offsetTop);
};


/**
 * Returns the viewport element for a particular document
 * @param {Node} opt_node DOM node (Document is OK) to get the viewport element
 *     of.
 * @return {Element} document.documentElement or document.body.
 */
goog.style.getClientViewportElement = function(opt_node) {
  var doc;
  if (opt_node) {
    if (opt_node.nodeType == goog.dom.NodeType.DOCUMENT) {
      doc = opt_node;
    } else {
      doc = goog.dom.getOwnerDocument(opt_node);
    }
  } else {
    doc = goog.dom.getDocument();
  }

  // In old IE versions the document.body represented the viewport
  if (goog.userAgent.IE && !goog.dom.getDomHelper(doc).isCss1CompatMode()) {
    return doc.body;
  }
  return doc.documentElement;
};


/**
 * Gets the client rectangle of the DOM element.
 *
 * getBoundingClientRect is part of a new CSS object model draft (with a
 * long-time presence in IE), replacing the error-prone parent offset
 * computation and the now-deprecated Gecko getBoxObjectFor.
 *
 * This utility patches common browser bugs in getClientBoundingRect. It
 * will fail if getClientBoundingRect is unsupported.
 *
 * @param {Element} el The element whose bounding rectangle is being queried.
 * @return {Object} A native bounding rectangle with numerical left, top,
 *     right, and bottom.  Reported by Firefox to be of object type ClientRect.
 * @private
 */
goog.style.getBoundingClientRect_ = function(el) {
  var rect = el.getBoundingClientRect();
  // Patch the result in IE only, so that this function can be inlined if
  // compiled for non-IE.
  if (goog.userAgent.IE) {

    // In IE, most of the time, 2 extra pixels are added to the top and left
    // due to the implicit 2-pixel inset border.  In IE6/7 quirks mode and
    // IE6 standards mode, this border can be overridden by setting the
    // document element's border to zero -- thus, we cannot rely on the
    // offset always being 2 pixels.

    // In quirks mode, the offset can be determined by querying the body's
    // clientLeft/clientTop, but in standards mode, it is found by querying
    // the document element's clientLeft/clientTop.  Since we already called
    // getClientBoundingRect we have already forced a reflow, so it is not
    // too expensive just to query them all.

    // See: http://msdn.microsoft.com/en-us/library/ms536433(VS.85).aspx
    var doc = el.ownerDocument;
    rect.left -= doc.documentElement.clientLeft + doc.body.clientLeft;
    rect.top -= doc.documentElement.clientTop + doc.body.clientTop;
  }
  return /** @type {Object} */ (rect);
};


/**
 * Returns the first parent that could affect the position of a given element.
 * @param {Element} element The element to get the offset parent for.
 * @return {Element?} The first offset parent or null if one cannot be found.
 */
goog.style.getOffsetParent = function(element) {
  // element.offsetParent does the right thing in IE, in other browser it
  // only includes elements with position absolute, relative or fixed, not
  // elements with overflow set to auto or scroll.
  if (goog.userAgent.IE) {
    return element.offsetParent;
  }

  var doc = goog.dom.getOwnerDocument(element);
  var positionStyle = goog.style.getStyle_(element, 'position');
  var skipStatic = positionStyle == 'fixed' || positionStyle == 'absolute';
  for (var parent = element.parentNode; parent && parent != doc;
       parent = parent.parentNode) {
    positionStyle = goog.style.getStyle_(parent, 'position');
    skipStatic = skipStatic && positionStyle == 'static' &&
                 parent != doc.documentElement && parent != doc.body;
    if (!skipStatic && (parent.scrollWidth > parent.clientWidth ||
                        parent.scrollHeight > parent.clientHeight ||
                        positionStyle == 'fixed' ||
                        positionStyle == 'absolute')) {
      return parent;
    }
  }
  return null;
};


/**
 * Calculates and returns the visible rectangle for a given element. Returns a
 * box describing the visible portion of the nearest scrollable ancestor.
 * Coordinates are given relative to the document.
 *
 * @param {Element} element Element to get the visible rect for.
 * @return {goog.math.Box} Bounding elementBox describing the visible rect or
 *     null if scrollable ancestor isn't inside the visible viewport.
 */
goog.style.getVisibleRectForElement = function(element) {
  var visibleRect = new goog.math.Box(0, Infinity, Infinity, 0);
  var dom = goog.dom.getDomHelper(element);
  var scrollEl = dom.getDocumentScrollElement();
  var inContainer;

  // Determine the size of the visible rect by climbing the dom accounting for
  // all scrollable containers.
  for (var el = element; el = goog.style.getOffsetParent(el); ) {
    // clientWidth is zero for inline block elements in IE.
    if ((!goog.userAgent.IE || el.clientWidth != 0) &&
        (el.scrollWidth != el.clientWidth ||
         el.scrollHeight != el.clientHeight) &&
        goog.style.getStyle_(el, 'overflow') != 'visible') {
      var pos = goog.style.getPageOffset(el);
      var client = goog.style.getClientLeftTop(el);
      pos.x += client.x;
      pos.y += client.y;

      visibleRect.top = Math.max(visibleRect.top, pos.y);
      visibleRect.right = Math.min(visibleRect.right,
                                   pos.x + el.clientWidth);
      visibleRect.bottom = Math.min(visibleRect.bottom,
                                    pos.y + el.clientHeight);
      visibleRect.left = Math.max(visibleRect.left, pos.x);
      inContainer = inContainer || el != scrollEl;
    }
  }

  // Compensate for document scroll in non webkit browsers.
  var scrollX = scrollEl.scrollLeft, scrollY = scrollEl.scrollTop;
  if (goog.userAgent.WEBKIT) {
    visibleRect.left += scrollX;
    visibleRect.top += scrollY;
  } else {
    visibleRect.left = Math.max(visibleRect.left, scrollX);
    visibleRect.top = Math.max(visibleRect.top, scrollY);
  }
  if (!inContainer || goog.userAgent.WEBKIT) {
    visibleRect.right += scrollX;
    visibleRect.bottom += scrollY;
  }

  // Clip by the window's viewport.
  var winSize = dom.getViewportSize();
  visibleRect.right = Math.min(visibleRect.right, scrollX + winSize.width);
  visibleRect.bottom = Math.min(visibleRect.bottom, scrollY + winSize.height);

  return visibleRect.top >= 0 && visibleRect.left >= 0 &&
         visibleRect.bottom > visibleRect.top &&
         visibleRect.right > visibleRect.left ?
         visibleRect : null;
};


/**
 * Returns clientLeft (width of the left border and, if the directionality is
 * right to left, the vertical scrollbar) and clientTop as a coordinate object.
 *
 * @param {Element} el Element to get clientLeft for.
 * @return {goog.math.Coordinate} Client left and top.
 */
goog.style.getClientLeftTop = function(el) {
  // NOTE(eae): Gecko prior to 1.9 doesn't support clientTop/Left, see
  // https://bugzilla.mozilla.org/show_bug.cgi?id=111207
  if (goog.userAgent.GECKO && !goog.userAgent.isVersion('1.9')) {
    var left = parseFloat(goog.style.getComputedStyle(el, 'borderLeftWidth'));
    if (goog.style.isRightToLeft(el)) {
      var scrollbarWidth = el.offsetWidth - el.clientWidth - left -
          parseFloat(goog.style.getComputedStyle(el, 'borderRightWidth'));
      left += scrollbarWidth;
    }
    return new goog.math.Coordinate(left,
        parseFloat(goog.style.getComputedStyle(el, 'borderTopWidth')));
  }

  return new goog.math.Coordinate(el.clientLeft, el.clientTop);
};


/**
 * Returns a Coordinate object relative to the top-left of the HTML document.
 * Implemented as a single function to save having to do two recursive loops in
 * opera and safari just to get both coordinates.  If you just want one value do
 * use goog.style.getPageOffsetLeft() and goog.style.getPageOffsetTop(), but
 * note if you call both those methods the tree will be analysed twice.
 *
 * Note: this is based on Yahoo's getXY method.
 * @see http://developer.yahoo.net/yui/license.txt
 *
 * @param {Element} el Element to get the page offset for.
 * @return {goog.math.Coordinate} The page offset.
 */
goog.style.getPageOffset = function(el) {
  var box, doc = goog.dom.getOwnerDocument(el);
  var positionStyle = goog.style.getStyle_(el, 'position');

  // NOTE(eae): Gecko pre 1.9 normally use getBoxObjectFor to calculate the
  // position. When invoked for an element with position absolute and a negative
  // position though it can be off by one. Therefor the recursive implementation
  // is used in those (relatively rare) cases.
  var BUGGY_GECKO_BOX_OBJECT = goog.userAgent.GECKO && doc.getBoxObjectFor &&
      !el.getBoundingClientRect && positionStyle == 'absolute' &&
      (box = doc.getBoxObjectFor(el)) && (box.screenX < 0 || box.screenY < 0);

  // NOTE(arv): If element is hidden (display none or disconnected or any the
  // ancestors are hidden) we get (0,0) by default but we still do the
  // accumulation of scroll position.

  var pos = new goog.math.Coordinate(0, 0);
  var viewportElement = goog.style.getClientViewportElement(doc);
  if (el == viewportElement) {
    // viewport is always at 0,0 as that defined the coordinate system for this
    // function - this avoids special case checks in the code below
    return pos;
  }

  // IE and Gecko 1.9+.
  if (el.getBoundingClientRect) {
    box = goog.style.getBoundingClientRect_(el);
    // Must add the scroll coordinates in to get the absolute page offset
    // of element since getBoundingClientRect returns relative coordinates to
    // the viewport.
    var scrollCoord = goog.dom.getDomHelper(doc).getDocumentScroll();
    pos.x = box.left + scrollCoord.x;
    pos.y = box.top + scrollCoord.y;

  // Gecko prior to 1.9.
  } else if (doc.getBoxObjectFor && !BUGGY_GECKO_BOX_OBJECT) {
    // Gecko ignores the scroll values for ancestors, up to 1.9.  See:
    // https://bugzilla.mozilla.org/show_bug.cgi?id=328881 and
    // https://bugzilla.mozilla.org/show_bug.cgi?id=330619

    box = doc.getBoxObjectFor(el);
    var vpBox = doc.getBoxObjectFor(viewportElement);
    pos.x = box.screenX - vpBox.screenX;
    pos.y = box.screenY - vpBox.screenY;

  // Safari, Opera and Camino up to 1.0.4.
  } else {
    var parent = el;
    do {
      pos.x += parent.offsetLeft;
      pos.y += parent.offsetTop;
      // For safari/chrome, we need to add parent's clientLeft/Top as well.
      if (parent != el) {
        pos.x += parent.clientLeft || 0;
        pos.y += parent.clientTop || 0;
      }
      // In Safari when hit a position fixed element the rest of the offsets
      // are not correct.
      if (goog.userAgent.WEBKIT &&
          goog.style.getComputedPosition(parent) == 'fixed') {
        pos.x += doc.body.scrollLeft;
        pos.y += doc.body.scrollTop;
        break;
      }
      parent = parent.offsetParent;
    } while (parent && parent != el)

    // Opera & (safari absolute) incorrectly account for body offsetTop.
    if (goog.userAgent.OPERA || (goog.userAgent.WEBKIT &&
        positionStyle == 'absolute')) {
      pos.y -= doc.body.offsetTop;
    }

    for (parent = el; (parent = goog.style.getOffsetParent(parent)) &&
        parent != doc.body; ) {
      pos.x -= parent.scrollLeft;
      // Workaround for a bug in Opera 9.2 (and earlier) where table rows may
      // report an invalid scroll top value. The bug was fixed in Opera 9.5
      // however as that version supports getBoundingClientRect it won't
      // trigger this code path. https://bugs.opera.com/show_bug.cgi?id=249965
      if (!goog.userAgent.OPERA || parent.tagName != 'TR') {
        pos.y -= parent.scrollTop;
      }
    }
  }

  return pos;
};


/**
 * Returns the left coordinate of an element relative to the HTML document
 * @param {Element} el Elements.
 * @return {number} The left coordinate.
 */
goog.style.getPageOffsetLeft = function(el) {
  return goog.style.getPageOffset(el).x;
};


/**
 * Returns the top coordinate of an element relative to the HTML document
 * @param {Element} el Elements.
 * @return {number} The top coordinate.
 */
goog.style.getPageOffsetTop = function(el) {
  return goog.style.getPageOffset(el).y;
};


/**
 * Returns a Coordinate object relative to the top-left of an HTML document
 * in an ancestor frame of this element. Used for measuring the position of
 * an element inside a frame relative to a containing frame.
 *
 * @param {Element} el Element to get the page offset for.
 * @param {Window} relativeWin The window to measure relative to. If relativeWin
 *     is not in the ancestor frame chain of the element, we measure relative to
 *     the top-most window.
 * @return {goog.math.Coordinate} The page offset.
 */
goog.style.getFramedPageOffset = function(el, relativeWin) {
  var position = new goog.math.Coordinate(0, 0);

  // Iterate up the ancestor frame chain, keeping track of the current window
  // and the current element in that window.
  var currentWin = goog.dom.getWindow(goog.dom.getOwnerDocument(el));
  var currentEl = el;
  do {
    // if we're at the top window, we want to get the page offset.
    // if we're at an inner frame, we only want to get the window position
    // so that we can determine the actual page offset in the context of
    // the outer window.
    var offset = currentWin == relativeWin ?
        goog.style.getPageOffset(currentEl) :
        goog.style.getClientPosition(currentEl);

    position.x += offset.x;
    position.y += offset.y;
  } while (currentWin && currentWin != relativeWin &&
      (currentEl = currentWin.frameElement) &&
      (currentWin = currentWin.parent));

  return position;
};


/**
 * Translates the specified rect relative to origBase page, for newBase page.
 * If origBase and newBase are the same, this function does nothing.
 *
 * @param {goog.math.Rect} rect The source rectangle relative to origBase page,
 *     and it will have the translated result.
 * @param {!goog.dom.DomHelper} origBase The DomHelper for the input rectangle.
 * @param {!goog.dom.DomHelper} newBase The DomHelper for the resultant
 *     coordinate.  This must be a DOM for an ancestor frame of origBase
 *     or the same as origBase.
 */
goog.style.translateRectForAnotherFrame = function(rect, origBase, newBase) {
  if (origBase.getDocument() != newBase.getDocument()) {
    var body = origBase.getDocument().body;
    var pos = goog.style.getFramedPageOffset(body, newBase.getWindow());

    // Adjust Body's margin.
    pos = goog.math.Coordinate.difference(pos, goog.style.getPageOffset(body));

    if (goog.userAgent.IE && !origBase.isCss1CompatMode()) {
      pos = goog.math.Coordinate.difference(pos, origBase.getDocumentScroll());
    }

    rect.left += pos.x;
    rect.top += pos.y;
  }
};


/**
 * Returns the position of an element relative to another element in the
 * document.  A relative to B
 * @param {Element|Event|goog.events.Event} a Element or mouse event who's
 *     position we're calculating.
 * @param {Element|Event|goog.events.Event} b Element or mouse event position
 *     is relative to.
 * @return {goog.math.Coordinate} The relative position.
 */
goog.style.getRelativePosition = function(a, b) {
  var ap = goog.style.getClientPosition(a);
  var bp = goog.style.getClientPosition(b);
  return new goog.math.Coordinate(ap.x - bp.x, ap.y - bp.y);
};


/**
 * Returns the position relative to the client viewport.
 * @param {Element|Event} el Element or a mouse event object.
 * @return {goog.math.Coordinate} The position.
 */
goog.style.getClientPosition = function(el) {
  var pos = new goog.math.Coordinate;
  if (el.nodeType == goog.dom.NodeType.ELEMENT) {
    if (el.getBoundingClientRect) {  // IE and Gecko 1.9+
      var box = goog.style.getBoundingClientRect_(el);
      pos.x = box.left;
      pos.y = box.top;
    } else {
      var scrollCoord = goog.dom.getDomHelper(/** @type {Element} */ (el))
          .getDocumentScroll();
      var pageCoord = goog.style.getPageOffset(/** @type {Element} */ (el));
      pos.x = pageCoord.x - scrollCoord.x;
      pos.y = pageCoord.y - scrollCoord.y;
    }
  } else {
    pos.x = el.clientX;
    pos.y = el.clientY;
  }

  return pos;
};


/**
 * Sets the top and left of an element such that it will have a
 *
 * @param {Element} el The element to set page offset for.
 * @param {number|goog.math.Coordinate} x Left position or coordinate obj.
 * @param {number} opt_y Top position.
 */
goog.style.setPageOffset = function(el, x, opt_y) {
  // Get current pageoffset
  var cur = goog.style.getPageOffset(el);

  if (x instanceof goog.math.Coordinate) {
    opt_y = x.y;
    x = x.x;
  }

  // NOTE(arv): We cannot allow strings for x and y. We could but that would
  // require us to manually transform between different units

  // Work out deltas
  var dx = x - cur.x;
  var dy = opt_y - cur.y;

  // Set position to current left/top + delta
  goog.style.setPosition(el, el.offsetLeft + dx, el.offsetTop + dy);
};


/**
 * Sets the width/height values of an element.  If an argument is numeric,
 * or a goog.math.Size is passed, it is assumed to be pixels and will add
 * 'px' after converting it to an integer in string form. (This just sets the
 * CSS width and height properties so it might set content-box or border-box
 * size depending on the box model the browser is using.)
 *
 * @param {Element} element Element to move.
 * @param {string|number|goog.math.Size} w Width of the element, or a
 *     size object.
 * @param {string|number} opt_h Height of the element. Required if w is not a
 *     size object.
 */
goog.style.setSize = function(element, w, opt_h) {
  var h;
  if (w instanceof goog.math.Size) {
    h = w.height;
    w = w.width;
  } else {
    if (opt_h == undefined) {
      throw Error('missing height argument');
    }
    h = opt_h;
  }

  element.style.width = typeof w == 'number' ? Math.round(w) + 'px' :
                                               /** @type {string} */(w);
  element.style.height = typeof h == 'number' ? Math.round(h) + 'px' :
                                                /** @type {string} */(h);
};


/**
 * Gets the height and width of an element, even if its display is none.
 * Specifically, this returns the height and width of the border box,
 * irrespective of the box model in effect.
 * @param {Element} element Element to get width of.
 * @return {goog.math.Size} Object with width/height properties.
 */
goog.style.getSize = function(element) {
  var hasOperaBug = goog.userAgent.OPERA && !goog.userAgent.isVersion('10');
  if (goog.style.getStyle_(element, 'display') != 'none') {
    if (hasOperaBug) {
      return new goog.math.Size(element.offsetWidth || element.clientWidth,
                                element.offsetHeight || element.clientHeight);
    } else {
      return new goog.math.Size(element.offsetWidth, element.offsetHeight);
    }
  }

  var style = element.style;
  var originalDisplay = style.display;
  var originalVisibility = style.visibility;
  var originalPosition = style.position;

  style.visibility = 'hidden';
  style.position = 'absolute';
  style.display = 'inline';

  var originalWidth, originalHeight;
  if (hasOperaBug) {
    originalWidth = element.offsetWidth || element.clientWidth;
    originalHeight = element.offsetHeight || element.clientHeight;
  } else {
    originalWidth = element.offsetWidth;
    originalHeight = element.offsetHeight;
  }

  style.display = originalDisplay;
  style.position = originalPosition;
  style.visibility = originalVisibility;

  return new goog.math.Size(originalWidth, originalHeight);
};


/**
 * Returns a bounding rectangle for a given element in page space.
 * @param {Element} element Element to get bounds of.
 * @return {goog.math.Rect} Bounding rectangle for the element.
 */
goog.style.getBounds = function(element) {
  var o = goog.style.getPageOffset(element);
  var s = goog.style.getSize(element);
  return new goog.math.Rect(o.x, o.y, s.width, s.height);
};


/**
 * A memoized cache for goog.style.toCamelCase.
 * @type {Object}
 * @private
 */
goog.style.toCamelCaseCache_ = {};


/**
 * Converts a CSS selector in the form style-property to styleProperty
 * @param {string} selector CSS Selector.
 * @return {string} Camel case selector.
 */
goog.style.toCamelCase = function(selector) {
  return goog.style.toCamelCaseCache_[selector] ||
    (goog.style.toCamelCaseCache_[selector] =
        String(selector).replace(/\-([a-z])/g, function(all, match) {
          return match.toUpperCase();
        }));
};


/**
 * Converts a CSS selector in the form styleProperty to style-property
 * @param {string} selector Camel case selector.
 * @return {string} Selector cased.
 */
goog.style.toSelectorCase = function(selector) {
  return selector.replace(/([A-Z])/g, '-$1').toLowerCase();
};


/**
 * Gets the opacity of a node (x-browser). This gets the inline style opacity
 * of the node, and does not take into account the cascaded or the computed
 * style for this node.
 * @param {Element} el Element whose opacity has to be found.
 * @return {number|string} Opacity between 0 and 1 or an empty string {@code ''}
 *     if the opacity is not set.
 */
goog.style.getOpacity = function(el) {
  var style = el.style;
  var result = '';
  if ('opacity' in style) {
    result = style.opacity;
  } else if ('MozOpacity' in style) {
    result = style.MozOpacity;
  } else if ('filter' in style) {
    var match = style.filter.match(/alpha\(opacity=([\d.]+)\)/);
    if (match) {
      result = String(match[1] / 100);
    }
  }
  return result == '' ? result : Number(result);
};


/**
 * Sets the opacity of a node (x-browser).
 * @param {Element} el Elements whose opacity has to be set.
 * @param {number|string} alpha Opacity between 0 and 1 or an empty string
 *     {@code ''} to clear the opacity.
 */
goog.style.setOpacity = function(el, alpha) {
  var style = el.style;
  if ('opacity' in style) {
    style.opacity = alpha;
  } else if ('MozOpacity' in style) {
    style.MozOpacity = alpha;
  } else if ('filter' in style) {
    if (alpha === '') {
      style.filter = '';
    } else {
      style.filter = 'alpha(opacity=' + alpha * 100 + ')';
    }
  }
};


/**
 * Sets the background of an element to a transparent image in a browser-
 * independent manner.
 *
 * This function does not support repeating backgrounds or alternate background
 * positions to match the behavior of Internet Explorer. It also does not
 * support sizingMethods other than crop since they cannot be replicated in
 * browsers other than Internet Explorer.
 *
 * @param {Element} el The element to set background on.
 * @param {string} src The image source URL.
 */
goog.style.setTransparentBackgroundImage = function(el, src) {
  var style = el.style;
  // It is safe to use the style.filter in IE only. In Safari 'filter' is in
  // style object but access to style.filter causes it to throw an exception.
  // Note: IE8 supports images with an alpha channel.
  if (goog.userAgent.IE && !goog.userAgent.isVersion('8')) {
    style.filter = 'progid:DXImageTransform.Microsoft.AlphaImageLoader(' +
        'src="' + src + '", sizingMethod="crop")';
  } else {
    // Set style properties individually instead of using background shorthand
    // to prevent overwriting a pre-existing background color.
    style.backgroundImage = 'url(' + src + ')';
    style.backgroundPosition = 'top left';
    style.backgroundRepeat = 'no-repeat';
  }
};


/**
 * Clears the background image of an element in a browser independent manner.
 * @param {Element} el The element to clear background image for.
 */
goog.style.clearTransparentBackgroundImage = function(el) {
  var style = el.style;
  if ('filter' in style) {
    style.filter = '';
  } else {
    // Set style properties individually instead of using background shorthand
    // to prevent overwriting a pre-existing background color.
    style.backgroundImage = 'none';
  }
};


/**
 * Shows or hides an element from the page. Hiding the element is done by
 * setting the display property to "none", removing the element from the
 * rendering hierarchy so it takes up no space. To show the element, the default
 * inherited display property is restored (defined either in stylesheets or by
 * the browser's default style rules.)
 *
 * Caveat 1: if the inherited display property for the element is set to "none"
 * by the stylesheets, that is the property that will be restored by a call to
 * showElement(), effectively toggling the display between "none" and "none".
 *
 * Caveat 2: if the element display style is set inline (by setting either
 * element.style.display or a style attribute in the HTML), a call to
 * showElement will clear that setting and defer to the inherited style in the
 * stylesheet.
 * @param {Element} el Element to show or hide.
 * @param {*} display True to render the element in its default style,
 * false to disable rendering the element.
 */
goog.style.showElement = function(el, display) {
  el.style.display = display ? '' : 'none';
};


/**
 * Test whether the given element has been shown or hidden via a call to
 * {@link #showElement}.
 *
 * Note this is strictly a companion method for a call
 * to {@link #showElement} and the same caveats apply; in particular, this
 * method does not guarantee that the return value will be consistent with
 * whether or not the element is actually visible.
 *
 * @param {Element} el The element to test.
 * @return {boolean} Whether the element has been shown.
 * @see #showElement
 */
goog.style.isElementShown = function(el) {
  return el.style.display != 'none';
};


/**
 * Installs the styles string into the window that contains opt_element.  If
 * opt_element is null, the main window is used.
 * @param {string} stylesString The style string to install.
 * @param {Element} opt_element Element who's parent document should have the
 *     styles installed.
 * @return {Element} The style element created.
 */
goog.style.installStyles = function(stylesString, opt_element) {
  var dh = goog.dom.getDomHelper(opt_element);
  var styleSheet = null;

  if (goog.userAgent.IE) {
    styleSheet = dh.getDocument().createStyleSheet();
  } else {
    var head = dh.$$('head')[0];

    // In opera documents are not guaranteed to have a head element, thus we
    // have to make sure one exists before using it.
    if (!head) {
      var body = dh.$$('body')[0];
      head = dh.createDom('head');
      body.parentNode.insertBefore(head, body);
    }
    styleSheet = dh.createDom('style');
    dh.appendChild(head, styleSheet);
  }

  goog.style.setStyles(styleSheet, stylesString);
  return styleSheet;
};


/**
 * Sets the content of a style element.  The style element can be any valid
 * style element.  This element will have its content completely replaced by
 * the new stylesString.
 * @param {Element} element A stylesheet element as returned by installStyles.
 * @param {string} stylesString The new content of the stylesheet.
 */
goog.style.setStyles = function(element, stylesString) {
  if (goog.userAgent.IE) {
    // Adding the selectors individually caused the browser to hang if the
    // selector was invalid or there were CSS comments.  Setting the cssText of
    // the style node works fine and ignores CSS that IE doesn't understand
    element.cssText = stylesString;
  } else {
    var propToSet = goog.userAgent.WEBKIT ? 'innerText' : 'innerHTML';
    element[propToSet] = stylesString;
  }
};


/**
 * Sets 'white-space: pre-wrap' for a node (x-browser).
 *
 * There are as many ways of specifying pre-wrap as there are browsers.
 *
 * CSS3:    white-space: pre-wrap;
 * Mozilla: white-space: -moz-pre-wrap;
 * Opera:   white-space: -o-pre-wrap;
 * IE6/7:   white-space: pre; word-wrap: break-word;
 *
 * @param {Element} el Element to enable pre-wrap for.
 */
goog.style.setPreWrap = function(el) {
  var style = el.style;
  if (goog.userAgent.IE) {
    style.whiteSpace = 'pre';
    style.wordWrap = 'break-word';
  } else if (goog.userAgent.GECKO) {
    style.whiteSpace = '-moz-pre-wrap';
  } else if (goog.userAgent.OPERA) {
    style.whiteSpace = '-o-pre-wrap';
  } else {
    style.whiteSpace = 'pre-wrap';
  }
};


/**
 * Sets 'display: inline-block' for an element (cross-browser).
 * @param {Element} el Element to which the inline-block display style is to be
 *    applied.
 */
goog.style.setInlineBlock = function(el) {
  var style = el.style;
  // Without position:relative, weirdness ensues.  Just accept it and move on.
  style.position = 'relative';

  if (goog.userAgent.IE && !goog.userAgent.isVersion('8')) {
    // IE8 supports inline-block so fall through to the else
    // Zoom:1 forces hasLayout, display:inline gives inline behavior.
    style.zoom = '1';
    style.display = 'inline';
  } else if (goog.userAgent.GECKO) {
    // Pre-Firefox 3, Gecko doesn't support inline-block, but -moz-inline-box
    // is close enough.
    style.display = goog.userAgent.isVersion('1.9a') ? 'inline-block' :
        '-moz-inline-box';
  } else {
    // Opera, Webkit, and Safari seem to do OK with the standard inline-block
    // style.
    style.display = 'inline-block';
  }
};


/**
 * Determines whether the given content element needs to be placed in a wrapper
 * div before being appended to an inline-block element. Because Firefox2
 * does not properly support inline-block, some elements need this so that RTL
 * characters are preserved.
 * @param {string|Node|NodeList|Array.<Node>} content Content element in the
 *     form of a child argument to {@link goog.dom.createDom}.
 * @return {boolean} Whether a wrapper is needed.
 */
goog.style.needsInlineBlockWrapper = function(content) {
  return goog.style.browserNeedsInlineBlockWrapper_ &&
      goog.style.hasUnguardedText_(content);
};


/**
 * Determines whether the given content element has text nodes that are not
 * wrapped in a div.
 * @param {string|Node|Array.<Node>} content Content element in the form
 *     of a child argument to {@link goog.dom.createDom}.
 * @return {boolean} Whether there are text nodes.
 * @private
 */
goog.style.hasUnguardedText_ = function(content) {
  if (!content) {
    return false;
  } else if (goog.isString(content) ||
      content.nodeType == goog.dom.NodeType.TEXT) {
    return true;
  } else {
    // content must be an array.
    return goog.array.some(content, goog.style.hasUnguardedText_);
  }
};


/**
 * On FF2, text nodes cannot be placed directly under an inline-block element.
 * If they are, FF2 will change all RTL characters to LTR characters.
 * @type {boolean}
 * @private
 */
goog.style.browserNeedsInlineBlockWrapper_ = goog.userAgent.GECKO &&
    !goog.userAgent.isVersion('1.9');


/**
 * Returns true if the element is using right to left (rtl) direction.
 * @param {Element} el  The element to test.
 * @return {boolean} True for right to left, false for left to right.
 */
goog.style.isRightToLeft = function(el) {
  return 'rtl' == goog.style.getStyle_(el, 'direction');
};


/**
 * The CSS style property corresponding to an element being
 * unselectable on the current browser platform (null if none).
 * Opera and IE instead use a DOM attribute 'unselectable'.
 * @type {string?}
 * @private
 */
goog.style.unselectableStyle_ =
    goog.userAgent.GECKO ? 'MozUserSelect' :
    goog.userAgent.WEBKIT ? 'WebkitUserSelect' :
    null;


/**
 * Returns true if the element is set to be unselectable, false otherwise.
 * Note that on some platforms (e.g. Mozilla), even if an element isn't set
 * to be unselectable, it will behave as such if any of its ancestors is
 * unselectable.
 * @param {Element} el  Element to check.
 * @return {boolean}  Whether the element is set to be unselectable.
 */
goog.style.isUnselectable = function(el) {
  if (goog.style.unselectableStyle_) {
    return el.style[goog.style.unselectableStyle_].toLowerCase() == 'none';
  } else if (goog.userAgent.IE || goog.userAgent.OPERA) {
    return el.getAttribute('unselectable') == 'on';
  }
  return false;
};


/**
 * Makes the element and its descendants selectable or unselectable.  Note
 * that on some platforms (e.g. Mozilla), even if an element isn't set to
 * be unselectable, it will behave as such if any of its ancestors is
 * unselectable.
 * @param {Element} el  The element to alter.
 * @param {boolean} unselectable  Whether the element and its descendants
 *     should be made unselectable.
 * @param {boolean} opt_noRecurse  Whether to only alter the element's own
 *     selectable state, and leave its descendants alone; defaults to false.
 */
goog.style.setUnselectable = function(el, unselectable, opt_noRecurse) {
  var descendants = !opt_noRecurse ? el.getElementsByTagName('*') : null;
  var name = goog.style.unselectableStyle_;
  if (name) {
    // Add/remove the appropriate CSS style to/from the element and its
    // descendants.
    var value = unselectable ? 'none' : '';
    el.style[name] = value;
    if (descendants) {
      for (var i = 0, descendant; descendant = descendants[i]; i++) {
        descendant.style[name] = value;
      }
    }
  } else if (goog.userAgent.IE || goog.userAgent.OPERA) {
    // Toggle the 'unselectable' attribute on the element and its descendants.
    var value = unselectable ? 'on' : '';
    el.setAttribute('unselectable', value);
    if (descendants) {
      for (var i = 0, descendant; descendant = descendants[i]; i++) {
        descendant.setAttribute('unselectable', value);
      }
    }
  }
};


/**
 * Gets the border box size for an element.
 * @param {Element} element  The element to get the size for.
 * @return {goog.math.Size} The border box size.
 */
goog.style.getBorderBoxSize = function(element) {
  return new goog.math.Size(element.offsetWidth, element.offsetHeight);
};


/**
 * Sets the border box size of an element. This is potentially expensive in IE
 * if the document is CSS1Compat mode
 * @param {Element} element  The element to set the size on.
 * @param {goog.math.Size} size  The new size.
 */
goog.style.setBorderBoxSize = function(element, size) {
  var doc = goog.dom.getOwnerDocument(element);
  var isCss1CompatMode = goog.dom.getDomHelper(doc).isCss1CompatMode();

  if (goog.userAgent.IE &&
      (!isCss1CompatMode || !goog.userAgent.isVersion('8'))) {
    var style = element.style;
    if (isCss1CompatMode) {
      var paddingBox = goog.style.getPaddingBox(element);
      var borderBox = goog.style.getBorderBox(element);
      style.pixelWidth = size.width - borderBox.left - paddingBox.left -
                         paddingBox.right - borderBox.right;
      style.pixelHeight = size.height - borderBox.top - paddingBox.top -
                          paddingBox.bottom - borderBox.bottom;
    } else {
      style.pixelWidth = size.width;
      style.pixelHeight = size.height;
    }
  } else {
    goog.style.setBoxSizingSize_(element, size, 'border-box');
  }
};


/**
 * Gets the content box size for an element.  This is potentially expensive in
 * all browsers.
 * @param {Element} element  The element to get the size for.
 * @return {goog.math.Size} The content box size.
 */
goog.style.getContentBoxSize = function(element) {
  var doc = goog.dom.getOwnerDocument(element);
  var ieCurrentStyle = goog.userAgent.IE && element.currentStyle;
  if (ieCurrentStyle &&
      goog.dom.getDomHelper(doc).isCss1CompatMode() &&
      ieCurrentStyle.width != 'auto' && ieCurrentStyle.height != 'auto' &&
      !ieCurrentStyle.boxSizing) {
    // If IE in CSS1Compat mode than just use the width and height.
    // If we have a boxSizing then fall back on measuring the borders etc.
    var width = goog.style.getIePixelValue_(element, ieCurrentStyle.width,
                                            'width', 'pixelWidth');
    var height = goog.style.getIePixelValue_(element, ieCurrentStyle.height,
                                             'height', 'pixelHeight');
    return new goog.math.Size(width, height);
  } else {
    var borderBoxSize = goog.style.getBorderBoxSize(element);
    var paddingBox = goog.style.getPaddingBox(element);
    var borderBox = goog.style.getBorderBox(element);
    return new goog.math.Size(borderBoxSize.width -
                              borderBox.left - paddingBox.left -
                              paddingBox.right - borderBox.right,
                              borderBoxSize.height -
                              borderBox.top - paddingBox.top -
                              paddingBox.bottom - borderBox.bottom);
  }
};


/**
 * Sets the content box size of an element. This is potentially expensive in IE
 * if the document is BackCompat mode.
 * @param {Element} element  The element to set the size on.
 * @param {goog.math.Size} size  The new size.
 */
goog.style.setContentBoxSize = function(element, size) {
  var doc = goog.dom.getOwnerDocument(element);
  var isCss1CompatMode = goog.dom.getDomHelper(doc).isCss1CompatMode();
  if (goog.userAgent.IE &&
      (!isCss1CompatMode || !goog.userAgent.isVersion('8'))) {
    var style = element.style;
    if (isCss1CompatMode) {
      style.pixelWidth = size.width;
      style.pixelHeight = size.height;
    } else {
      var paddingBox = goog.style.getPaddingBox(element);
      var borderBox = goog.style.getBorderBox(element);
      style.pixelWidth = size.width + borderBox.left + paddingBox.left +
                         paddingBox.right + borderBox.right;
      style.pixelHeight = size.height + borderBox.top + paddingBox.top +
                          paddingBox.bottom + borderBox.bottom;
    }
  } else {
    goog.style.setBoxSizingSize_(element, size, 'content-box');
  }
};


/**
 * Helper function that sets the box sizing as well as the width and height
 * @param {Element} element  The element to set the size on.
 * @param {goog.math.Size} size  The new size to set.
 * @param {string} boxSizing  The box-sizing value.
 * @private
 */
goog.style.setBoxSizingSize_ = function(element, size, boxSizing) {
  var style = element.style;
  if (goog.userAgent.GECKO) {
    style.MozBoxSizing = boxSizing;
  } else if (goog.userAgent.WEBKIT) {
    style.WebkitBoxSizing = boxSizing;
  } else if (goog.userAgent.OPERA && !goog.userAgent.isVersion('9.50')) {
    // Opera pre-9.5 does not have CSSStyleDeclaration::boxSizing, but
    // box-sizing can still be set via CSSStyleDeclaration::setProperty.
    if (boxSizing) {
      style.setProperty('box-sizing', boxSizing);
    } else {
      style.removeProperty('box-sizing');
    }
  } else {
    // Includes IE8
    style.boxSizing = boxSizing;
  }
  style.width = size.width + 'px';
  style.height = size.height + 'px';
};


/**
 * IE specific function that converts a non pixel unit to pixels.
 * @param {Element} element  The element to convert the value for.
 * @param {string} value  The current value as a string. The value must not be
 *     ''.
 * @param {string} name  The CSS property name to use for the converstion. This
 *     should be 'left', 'top', 'width' or 'height'.
 * @param {string} pixelName  The CSS pixel property name to use to get the
 *     value in pixels.
 * @return {number} The value in pixels.
 * @private
 */
goog.style.getIePixelValue_ = function(element, value, name, pixelName) {
  // Try if we already have a pixel value. IE does not do half pixels so we
  // only check if it matches a number followed by 'px'.
  if (/^\d+px?$/.test(value)) {
    return parseInt(value, 10);
  } else {
    var oldStyleValue = element.style[name];
    var oldRuntimeValue = element.runtimeStyle[name];
    // set runtime style to prevent changes
    element.runtimeStyle[name] = element.currentStyle[name];
    element.style[name] = value;
    var pixelValue = element.style[pixelName];
    // restore
    element.style[name] = oldStyleValue;
    element.runtimeStyle[name] = oldRuntimeValue;
    return pixelValue;
  }
};


/**
 * Helper function for getting the pixel padding or margin for IE.
 * @param {Element} element  The element to get the padding for.
 * @param {string} propName  The property name.
 * @return {number} The pixel padding.
 * @private
 */
goog.style.getIePixelDistance_ = function(element, propName) {
  return goog.style.getIePixelValue_(element,
      goog.style.getCascadedStyle(element, propName),
      'left', 'pixelLeft');
};


/**
 * Gets the computed paddings or margins (on all sides) in pixels.
 * @param {Element} element  The element to get the padding for.
 * @param {string} stylePrefix  Pass 'padding' to retrieve the padding box,
 *     or 'margin' to retrieve the margin box.
 * @return {goog.math.Box} The computed paddings or margins.
 * @private
 */
goog.style.getBox_ = function(element, stylePrefix) {
  if (goog.userAgent.IE) {
    var left = goog.style.getIePixelDistance_(element, stylePrefix + 'Left');
    var right = goog.style.getIePixelDistance_(element, stylePrefix + 'Right');
    var top = goog.style.getIePixelDistance_(element, stylePrefix + 'Top');
    var bottom = goog.style.getIePixelDistance_(
        element, stylePrefix + 'Bottom');
    return new goog.math.Box(top, right, bottom, left);
  } else {
    // On non-IE browsers, getComputedStyle is always non-null.
    var left = /** @type {string} */ (
        goog.style.getComputedStyle(element, stylePrefix + 'Left'));
    var right = /** @type {string} */ (
        goog.style.getComputedStyle(element, stylePrefix + 'Right'));
    var top = /** @type {string} */ (
        goog.style.getComputedStyle(element, stylePrefix + 'Top'));
    var bottom = /** @type {string} */ (
        goog.style.getComputedStyle(element, stylePrefix + 'Bottom'));

    // NOTE(arv): Gecko can return floating point numbers for the computed
    // style values.
    return new goog.math.Box(parseFloat(top),
                             parseFloat(right),
                             parseFloat(bottom),
                             parseFloat(left));
  }
};


/**
 * Gets the computed paddings (on all sides) in pixels.
 * @param {Element} element  The element to get the padding for.
 * @return {goog.math.Box} The computed paddings.
 */
goog.style.getPaddingBox = function(element) {
  return goog.style.getBox_(element, 'padding');
};


/**
 * Gets the computed margins (on all sides) in pixels.
 * @param {Element} element  The element to get the margins for.
 * @return {goog.math.Box} The computed margins.
 */
goog.style.getMarginBox = function(element) {
  return goog.style.getBox_(element, 'margin');
};


/**
 * A map used to map the border width keywords to a pixel width.
 * @type {Object}
 * @private
 */
goog.style.ieBorderWidthKeywords_ = {
  'thin': 2,
  'medium': 4,
  'thick': 6
};


/**
 * Helper function for IE to get the pixel border.
 * @param {Element} element  The element to get the pixel border for.
 * @param {string} prop  The part of the property name.
 * @return {number} The value in pixels.
 * @private
 */
goog.style.getIePixelBorder_ = function(element, prop) {
  if (goog.style.getCascadedStyle(element, prop + 'Style') == 'none') {
    return 0;
  }
  var width = goog.style.getCascadedStyle(element, prop + 'Width');
  if (width in goog.style.ieBorderWidthKeywords_) {
    return goog.style.ieBorderWidthKeywords_[width];
  }
  return goog.style.getIePixelValue_(element, width, 'left', 'pixelLeft');
};


/**
 * Gets the computed border widths (on all sides) in pixels
 * @param {Element} element  The element to get the border widths for.
 * @return {goog.math.Box} The computed border widths.
 */
goog.style.getBorderBox = function(element) {
  if (goog.userAgent.IE) {
    var left = goog.style.getIePixelBorder_(element, 'borderLeft');
    var right = goog.style.getIePixelBorder_(element, 'borderRight');
    var top = goog.style.getIePixelBorder_(element, 'borderTop');
    var bottom = goog.style.getIePixelBorder_(element, 'borderBottom');
    return new goog.math.Box(top, right, bottom, left);
  } else {
    // On non-IE browsers, getComputedStyle is always non-null.
    var left = /** @type {string} */ (
        goog.style.getComputedStyle(element, 'borderLeftWidth'));
    var right = /** @type {string} */ (
        goog.style.getComputedStyle(element, 'borderRightWidth'));
    var top = /** @type {string} */ (
        goog.style.getComputedStyle(element, 'borderTopWidth'));
    var bottom = /** @type {string} */ (
        goog.style.getComputedStyle(element, 'borderBottomWidth'));

    return new goog.math.Box(parseFloat(top),
                             parseFloat(right),
                             parseFloat(bottom),
                             parseFloat(left));
  }
};


/**
 * Returns the font face applied to a given node. Opera and IE should return
 * the font actually displayed. Firefox returns the author's most-preferred
 * font (whether the browser is capable of displaying it or not.)
 * @param {Element} el  The element whose font family is returned.
 * @return {string} The font family applied to el.
 */
goog.style.getFontFamily = function(el) {
  var doc = goog.dom.getOwnerDocument(el);
  var font = '';
  if (doc.createTextRange) {
    var range = doc.body.createTextRange();
    range.moveToElementText(el);
    font = range.queryCommandValue('FontName');
  }
  if (!font) {
    // Note if for some reason IE can't derive FontName with a TextRange, we
    // fallback to using currentStyle
    font = goog.style.getStyle_(el, 'fontFamily');
    // Opera on Linux provides the font vendor's name in square-brackets.
    if (goog.userAgent.OPERA && goog.userAgent.LINUX) {
      font = font.replace(/ \[[^\]]*\]/, '');
    }
  }

  // Firefox returns the applied font-family string (author's list of
  // preferred fonts.) We want to return the most-preferred font, in lieu of
  // the *actually* applied font.
  var fontsArray = font.split(',');
  if (fontsArray.length > 1) font = fontsArray[0];

  // Sanitize for x-browser consistency:
  // Strip quotes because browsers aren't consistent with how they're
  // applied; Opera always encloses, Firefox sometimes, and IE never.
  return goog.string.stripQuotes(font, '"\'');
};


/**
 * Returns the units used for a CSS length measurement.
 * @param {string} value  A CSS length quantity.
 * @return {string?} The units of measurement.
 */
goog.style.getLengthUnits = function(value) {
  var units = value.match(/[^\d]+$/);
  return units && units[0] || null;
};


/**
 * Map of absolute CSS length units
 * @type {Object}
 * @private
 */
goog.style.ABSOLUTE_CSS_LENGTH_UNITS_ = {
  'cm' : 1,
  'in' : 1,
  'mm' : 1,
  'pc' : 1,
  'pt' : 1
};


/**
 * Map of relative CSS length units that can be accurately converted to px
 * font-size values using getIePixelValue_. Only units that are defined in
 * relation to a font size are convertible (%, small, etc. are not).
 * @type {Object}
 * @private
 */
goog.style.CONVERTIBLE_RELATIVE_CSS_UNITS_ = {
  'em' : 1,
  'ex' : 1
};


/**
 * Returns the font size, in pixels, of text in an element.
 * @param {Element} el  The element whose font size is returned.
 * @return {number} The font size (in pixels).
 */
goog.style.getFontSize = function(el) {
  var fontSize = goog.style.getStyle_(el, 'fontSize');
  var sizeUnits = goog.style.getLengthUnits(fontSize);
  if (fontSize && 'px' == sizeUnits) {
    // NOTE(nathanl): This could be parseFloat instead, but IE doesn't return
    // decimal fractions in getStyle_ and Firefox reports the fractions, but
    // ignores them when rendering. Interestingly enough, when we force the
    // issue and size something to e.g., 50% of 25px, the browsers round in
    // opposite directions with Firefox reporting 12px and IE 13px. I punt.
    return parseInt(fontSize, 10);
  }

  // In IE, we can convert absolute length units to a px value using
  // goog.style.getIePixelValue_. Units defined in relation to a font size
  // (em, ex) are applied relative to the element's parentNode and can also
  // be converted.
  if (goog.userAgent.IE) {
    if (sizeUnits in goog.style.ABSOLUTE_CSS_LENGTH_UNITS_) {
      return goog.style.getIePixelValue_(el,
                                         fontSize,
                                         'left',
                                         'pixelLeft');
    } else if (el.parentNode &&
               sizeUnits in goog.style.CONVERTIBLE_RELATIVE_CSS_UNITS_) {
      return goog.style.getIePixelValue_(el.parentNode,
                                         fontSize,
                                         'left',
                                         'pixelLeft');
    }
  }

  // Sometimes we can't cleanly find the font size (some units relative to a
  // node's parent's font size are difficult: %, smaller et al), so we create
  // an invisible, absolutely-positioned span sized to be the height of an 'M'
  // rendered in its parent's (i.e., our target element's) font size. This is
  // the definition of CSS's font size attribute.
  var sizeElement = goog.dom.createDom(
      'span',
      {'style': 'visibility:hidden;position:absolute;' +
                'line-height:0;padding:0;margin:0;border:0;height:1em;'});
  goog.dom.appendChild(el, sizeElement);
  fontSize = sizeElement.offsetHeight;
  goog.dom.removeNode(sizeElement);

  return fontSize;
};


/**
 * Parses a style attribute value.  Converts CSS property names to camel case.
 * @param {string} value The style attribute value.
 * @return {!Object} Map of CSS properties to string values.
 */
goog.style.parseStyleAttribute = function(value) {
  var result = {};
  goog.array.forEach(value.split(/\s*;\s*/), function(pair) {
    var keyValue = pair.split(/\s*:\s*/);
    if (keyValue.length == 2) {
      result[goog.style.toCamelCase(keyValue[0].toLowerCase())] = keyValue[1];
    }
  });
  return result;
};


/**
 * Reverse of parseStyleAttribute; that is, takes a style object and returns the
 * corresponding attribute value.  Converts camel case property names to proper
 * CSS selector names.
 * @param {Object} obj Map of CSS properties to values.
 * @return {string} The style attribute value.
 */
goog.style.toStyleAttribute = function(obj) {
  var buffer = [];
  goog.object.forEach(obj, function(value, key) {
    buffer.push(goog.style.toSelectorCase(key), ':', value, ';');
  });
  return buffer.join('');
};


/**
 * Sets CSS float property on an element.
 * @param {Element} el The element to set float property on.
 * @param {string} value The value of float CSS property to set on this element.
 */
goog.style.setFloat = function(el, value) {
  el.style[goog.userAgent.IE ? 'styleFloat' : 'cssFloat'] = value;
};


/**
 * Gets value of explicitly-set float CSS property on an element.
 * @param {Element} el The element to get float property of.
 * @return {string} The value of explicitly-set float CSS property on this
 *     element.
 */
goog.style.getFloat = function(el) {
  return el.style[goog.userAgent.IE ? 'styleFloat' : 'cssFloat'] || '';
};

// Copyright 2006 Google Inc.
// All Rights Reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 
//  * Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
//  * Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in
//    the documentation and/or other materials provided with the
//    distribution.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
// INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
// BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
// LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
// ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE. 

/**
 * @fileoverview Generics method for collection-like classes and objects.
 *
 *
 * This file contains functions to work with collections. It supports using
 * Map, Set, Array and Object and other classes that implement collection-like
 * methods.
 *
 */


goog.provide('goog.structs');

goog.require('goog.array');
goog.require('goog.object');


// We treat an object as a dictionary if it has getKeys or it is an object that
// isn't arrayLike.


/**
 * Returns the number of values in the collection-like object.
 * @param {Object} col The collection-like object.
 * @return {number} The number of values in the collection-like object.
 */
goog.structs.getCount = function(col) {
  if (typeof col.getCount == 'function') {
    return col.getCount();
  }
  if (goog.isArrayLike(col) || goog.isString(col)) {
    return col.length;
  }
  return goog.object.getCount(col);
};


/**
 * Returns the values of the collection-like object.
 * @param {Object} col The collection-like object.
 * @return {Array} The values in the collection-like object.
 */
goog.structs.getValues = function(col) {
  if (typeof col.getValues == 'function') {
    return col.getValues();
  }
  if (goog.isString(col)) {
    return col.split('');
  }
  if (goog.isArrayLike(col)) {
    var rv = [];
    var l = col.length;
    for (var i = 0; i < l; i++) {
      rv.push(col[i]);
    }
    return rv;
  }
  return goog.object.getValues(col);
};


/**
 * Returns the keys of the collection. Some collections have no notion of
 * keys/indexes and this function will return undefined in those cases.
 * @param {Object} col The collection-like object.
 * @return {Array|undefined} The keys in the collection.
 */
goog.structs.getKeys = function(col) {
  if (typeof col.getKeys == 'function') {
    return col.getKeys();
  }
  // if we have getValues but no getKeys we know this is a key-less collection
  if (typeof col.getValues == 'function') {
    return undefined;
  }
  if (goog.isArrayLike(col) || goog.isString(col)) {
    var rv = [];
    var l = col.length;
    for (var i = 0; i < l; i++) {
      rv.push(i);
    }
    return rv;
  }

  return goog.object.getKeys(col);
};


/**
 * Whether the collection contains the given value. This is O(n) and uses
 * equals (==) to test the existence.
 * @param {Object} col The collection-like object.
 * @param {*} val The value to check for.
 * @return {boolean} True if the map contains the value.
 */
goog.structs.contains = function(col, val) {
  if (typeof col.contains == 'function') {
    return col.contains(val);
  }
  if (typeof col.containsValue == 'function') {
    return col.containsValue(val);
  }
  if (goog.isArrayLike(col) || goog.isString(col)) {
    return goog.array.contains(/** @type {Array} */ (col), val);
  }
  return goog.object.containsValue(col, val);
};


/**
 * Whether the collection is empty.
 * @param {Object} col The collection-like object.
 * @return {boolean} True if empty.
 */
goog.structs.isEmpty = function(col) {
  if (typeof col.isEmpty == 'function') {
    return col.isEmpty();
  }

  // We do not use goog.string.isEmpty because here we treat the string as
  // collection and as such even whitespace matters

  if (goog.isArrayLike(col) || goog.isString(col)) {
    return goog.array.isEmpty(/** @type {Array} */ (col));
  }
  return goog.object.isEmpty(col);
};


/**
 * Removes all the elements from the collection.
 * @param {Object} col The collection-like object.
 */
goog.structs.clear = function(col) {
  // NOTE(arv): This should not contain strings because strings are immutable
  if (typeof col.clear == 'function') {
    col.clear();
  } else if (goog.isArrayLike(col)) {
    goog.array.clear(col);
  } else {
    goog.object.clear(col);
  }
};


/**
 * Calls a function for each value in a collection. The function takes
 * three arguments; the value, the key and the collection.
 *
 * @param {Object} col The collection-like object.
 * @param {Function} f The function to call for every value. This function takes
 *     3 arguments (the value, the key or undefined if the collection has no
 *     notion of keys, and the collection) and the return value is irrelevant.
 * @param {Object} opt_obj The object to be used as the value of 'this'
 *     within {@code f}.
 */
goog.structs.forEach = function(col, f, opt_obj) {
  if (typeof col.forEach == 'function') {
    col.forEach(f, opt_obj);
  } else if (goog.isArrayLike(col) || goog.isString(col)) {
    goog.array.forEach(/** @type {Array} */ (col), f, opt_obj);
  } else {
    var keys = goog.structs.getKeys(col);
    var values = goog.structs.getValues(col);
    var l = values.length;
    for (var i = 0; i < l; i++) {
      f.call(opt_obj, values[i], keys && keys[i], col);
    }
  }
};


/**
 * Calls a function for every value in the collection. When a call returns true,
 * adds the value to a new collection (Array is returned by default).
 *
 * @param {Object} col The collection-like object.
 * @param {Function} f The function to call for every value. This function takes
 *     3 arguments (the value, the key or undefined if the collection has no
 *     notion of keys, and the collection) and should return a Boolean. If the
 *     return value is true the value is added to the result collection. If it
 *     is false the value is not included.
 * @param {Object} opt_obj The object to be used as the value of 'this'
 *     within {@code f}.
 * @return {Object|Array} A new collection where the passed values are present.
 *     If col is a key-less collection an array is returned.  If col has keys
 *     and values a plain old JS object is returned.
 */
goog.structs.filter = function(col, f, opt_obj) {
  if (typeof col.filter == 'function') {
    return col.filter(f, opt_obj);
  }
  if (goog.isArrayLike(col) || goog.isString(col)) {
    return goog.array.filter(/** @type {Array} */ (col), f, opt_obj);
  }

  var rv;
  var keys = goog.structs.getKeys(col);
  var values = goog.structs.getValues(col);
  var l = values.length;
  if (keys) {
    rv = {};
    for (var i = 0; i < l; i++) {
      if (f.call(opt_obj, values[i], keys[i], col)) {
        rv[keys[i]] = values[i];
      }
    }
  } else {
    // We should not use goog.array.filter here since we want to make sure that
    // the index is undefined as well as make sure that col is passed to the
    // function.
    rv = [];
    for (var i = 0; i < l; i++) {
      if (f.call(opt_obj, values[i], undefined, col)) {
        rv.push(values[i]);
      }
    }
  }
  return rv;
};


/**
 * Calls a function for every value in the collection and adds the result into a
 * new collection (defaults to creating a new Array).
 *
 * @param {Object} col The collection-like object.
 * @param {Function} f The function to call for every value. This function
 *     takes 3 arguments (the value, the key or undefined if the collection has
 *     no notion of keys, and the collection) and should return something. The
 *     result will be used as the value in the new collection.
 * @param {Object} opt_obj  The object to be used as the value of 'this'
 *     within {@code f}.
 * @return {Object|Array} A new collection with the new values.  If col is a
 *     key-less collection an array is returned.  If col has keys and values a
 *     plain old JS object is returned.
 */
goog.structs.map = function(col, f, opt_obj) {
  if (typeof col.map == 'function') {
    return col.map(f, opt_obj);
  }
  if (goog.isArrayLike(col) || goog.isString(col)) {
    return goog.array.map(/** @type {Array} */ (col), f, opt_obj);
  }

  var rv;
  var keys = goog.structs.getKeys(col);
  var values = goog.structs.getValues(col);
  var l = values.length;
  if (keys) {
    rv = {};
    for (var i = 0; i < l; i++) {
      rv[keys[i]] = f.call(opt_obj, values[i], keys[i], col);
    }
  } else {
    // We should not use goog.array.map here since we want to make sure that
    // the index is undefined as well as make sure that col is passed to the
    // function.
    rv = [];
    for (var i = 0; i < l; i++) {
      rv[i] = f.call(opt_obj, values[i], undefined, col);
    }
  }
  return rv;
};


/**
 * Calls f for each value in a collection. If any call returns true this returns
 * true (without checking the rest). If all returns false this returns false.
 *
 * @param {Object|Array|string} col The collection-like object.
 * @param {Function} f The function to call for every value. This function takes
 *     3 arguments (the value, the key or undefined if the collection has no
 *     notion of keys, and the collection) and should return a Boolean.
 * @param {Object} opt_obj  The object to be used as the value of 'this'
 *     within {@code f}.
 * @return {boolean} True if any value passes the test.
 */
goog.structs.some = function(col, f, opt_obj) {
  if (typeof col.some == 'function') {
    return col.some(f, opt_obj);
  }
  if (goog.isArrayLike(col) || goog.isString(col)) {
    return goog.array.some(/** @type {Array} */ (col), f, opt_obj);
  }
  var keys = goog.structs.getKeys(col);
  var values = goog.structs.getValues(col);
  var l = values.length;
  for (var i = 0; i < l; i++) {
    if (f.call(opt_obj, values[i], keys && keys[i], col)) {
      return true;
    }
  }
  return false;
};


/**
 * Calls f for each value in a collection. If all calls return true this return
 * true this returns true. If any returns false this returns false at this point
 *  and does not continue to check the remaining values.
 *
 * @param {Object} col The collection-like object.
 * @param {Function} f The function to call for every value. This function takes
 *     3 arguments (the value, the key or undefined if the collection has no
 *     notion of keys, and the collection) and should return a Boolean.
 * @param {Object} opt_obj  The object to be used as the value of 'this'
 *     within {@code f}.
 * @return {boolean} True if all key-value pairs pass the test.
 */
goog.structs.every = function(col, f, opt_obj) {
  if (typeof col.every == 'function') {
    return col.every(f, opt_obj);
  }
  if (goog.isArrayLike(col) || goog.isString(col)) {
    return goog.array.every(/** @type {Array} */ (col), f, opt_obj);
  }
  var keys = goog.structs.getKeys(col);
  var values = goog.structs.getValues(col);
  var l = values.length;
  for (var i = 0; i < l; i++) {
    if (!f.call(opt_obj, values[i], keys && keys[i], col)) {
      return false;
    }
  }
  return true;
};

// Copyright 2007 Google Inc.
// All Rights Reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 
//  * Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
//  * Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in
//    the documentation and/or other materials provided with the
//    distribution.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
// INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
// BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
// LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
// ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE. 

/**
 * @fileoverview Python style iteration utilities.
 */


goog.provide('goog.iter');
goog.provide('goog.iter.Iterator');
goog.provide('goog.iter.StopIteration');

goog.require('goog.array');


// For script engines that already support iterators.
if ('StopIteration' in goog.global) {
  /**
   * Singleton Error object that is used to terminate iterations.
   * @type {Error}
   */
  goog.iter.StopIteration = goog.global['StopIteration'];
} else {
  /**
   * Singleton Error object that is used to terminate iterations.
   * @type {Error}
   * @suppress {duplicate}
   */
  goog.iter.StopIteration = Error('StopIteration');
}



/**
 * Class/interface for iterators.  An iterator needs to implement a {@code next}
 * method and it needs to throw a {@code goog.iter.StopIteration} when the
 * iteration passes beyond the end.  Iterators have no {@code hasNext} method.
 * It is recommended to always use the helper functions to iterate over the
 * iterator or in case you are only targeting JavaScript 1.7 for in loops.
 * @constructor
 */
goog.iter.Iterator = function() {};


/**
 * Returns the next value of the iteration.  This will throw the object
 * {@see goog.iter#StopIteration} when the iteration passes the end.
 * @return {*} Any object or value.
 */
goog.iter.Iterator.prototype.next = function() {
  throw goog.iter.StopIteration;
};


/**
 * Returns the {@code Iterator} object itself.  This is used to implement
 * the iterator protocol in JavaScript 1.7
 * @param {boolean} opt_keys  Whether to return the keys or values. Default is
 *     to only return the values.  This is being used by the for-in loop (true)
 *     and the for-each-in loop (false).  Even though the param gives a hint
 *     about what the iterator will return there is no guarantee that it will
 *     return the keys when true is passed.
 * @return {goog.iter.Iterator} The object itself.
 */
goog.iter.Iterator.prototype.__iterator__ = function(opt_keys) {
  return this;
};



/**
 * Returns an iterator that knows how to iterate over the values in the object.
 * @param {goog.iter.Iterator|Object} iterable  If the object is an iterator it
 *     will be returned as is.  If the object has a {@code __iterator__} method
 *     that will be called to get the value iterator.  If the object is an
 *     array-like object we create an iterator for that.
 * @return {goog.iter.Iterator} An iterator that knows how to iterate over the
 *     values in {@code iterable}.
 */
goog.iter.toIterator = function(iterable) {
  if (iterable instanceof goog.iter.Iterator) {
    return iterable;
  }
  if (typeof iterable.__iterator__ == 'function') {
    return iterable.__iterator__(false);
  }
  if (goog.isArrayLike(iterable)) {
    var i = 0;
    var newIter = new goog.iter.Iterator;
    newIter.next = function() {
      while (true) {
        if (i >= iterable.length) {
          throw goog.iter.StopIteration;
        }
        // Don't include deleted elements.
        if (!(i in iterable)) {
          i++;
          continue;
        }
        return iterable[i++];
      }
    };
    return newIter;
  }


  // TODO(arv): Should we fall back on goog.structs.getValues()?
  throw Error('Not implemented');
};


/**
 * Calls a function for each element in the iterator with the element of the
 * iterator passed as argument.
 *
 * @param {goog.iter.Iterator|Array|Object} iterable  The iterator to iterate
 *     over.  If the iterable is an object {@code toIterator} will be called on
 *     it.
 * @param {Function} f  The function to call for every element.  This function
 *     takes 3 arguments (the element, undefined, and the iterator) and the
 *     return value is irrelevant.  The reason for passing undefined as the
 *     second argument is so that the same function can be used in
 *     {@see goog.array#forEach} as well as others.
 * @param {Object} opt_obj  The object to be used as the value of 'this' within
 *     {@code f}.
 */
goog.iter.forEach = function(iterable, f, opt_obj) {
  if (goog.isArrayLike(iterable)) {
    /** @preserveTry */
    try {
      goog.array.forEach(iterable, f, opt_obj);
    } catch (ex) {
      if (ex !== goog.iter.StopIteration) {
       throw ex;
      }
    }
  } else {
    iterable = goog.iter.toIterator(iterable);
    /** @preserveTry */
    try {
      while (true) {
        f.call(opt_obj, iterable.next(), undefined, iterable);
      }
    } catch (ex) {
      if (ex !== goog.iter.StopIteration) {
        throw ex;
      }
    }
  }
};


/**
 * Calls a function for every element in the iterator, and if the function
 * returns true adds the element to a new iterator.
 *
 * @param {goog.iter.Iterator} iterable The iterator to iterate over.
 * @param {Function} f The function to call for every element.  This function
 *     takes 3 arguments (the element, undefined, and the iterator) and should
 *     return a boolean.  If the return value is true the element will be
 *     included  in the returned iteror.  If it is false the element is not
 *     included.
 * @param {Object} opt_obj The object to be used as the value of 'this' within
 *     {@code f}.
 * @return {goog.iter.Iterator} A new iterator in which only elements that
 *     passed the test are present.
 */
goog.iter.filter = function(iterable, f, opt_obj) {
  iterable = goog.iter.toIterator(iterable);
  var newIter = new goog.iter.Iterator;
  newIter.next = function() {
    while (true) {
      var val = iterable.next();
      if (f.call(opt_obj, val, undefined, iterable)) {
        return val;
      }
    }
  };
  return newIter;
};


/**
 * Creates a new iterator that returns the values in a range.  This function
 * can take 1, 2 or 3 arguments:
 * <pre>
 * range(5) same as range(0, 5, 1)
 * range(2, 5) same as range(2, 5, 1)
 * </pre>
 *
 * @param {number} startOrStop  The stop value if only one argument is provided.
 *     The start value if 2 or more arguments are provided.  If only one
 *     argument is used the start value is 0.
 * @param {number} opt_stop  The stop value.  If left out then the first
 *     argument is used as the stop value.
 * @param {number} opt_step  The number to increment with between each call to
 *     next.  This can be negative.
 * @return {goog.iter.Iterator} A new iterator that returns the values in the
 *     range.
 */
goog.iter.range = function(startOrStop, opt_stop, opt_step) {
  var start = 0;
  var stop = startOrStop;
  var step = opt_step || 1;
  if (arguments.length > 1) {
    start = startOrStop;
    stop = opt_stop;
  }
  if (step == 0) {
    throw Error('Range step argument must not be zero');
  }

  var newIter = new goog.iter.Iterator;
  newIter.next = function() {
    if (step > 0 && start >= stop || step < 0 && start <= stop) {
      throw goog.iter.StopIteration;
    }
    var rv = start;
    start += step;
    return rv;
  };
  return newIter;
};


/**
 * Joins the values in a iterator with a delimiter.
 * @param {goog.iter.Iterator} iterable  The iterator to get the values from.
 * @param {string} deliminator  The text to put between the values.
 * @return {string} The joined value string.
 */
goog.iter.join = function(iterable, deliminator) {
  return goog.iter.toArray(iterable).join(deliminator);
};


/**
 * For every element in the iterator call a function and return a new iterator
 * with that value.
 *
 * @param {goog.iter.Iterator} iterable The iterator to iterate over.
 * @param {Function} f The function to call for every element.  This function
 *     takes 3 arguments (the element, undefined, and the iterator) and should
 *     return a new value.
 * @param {Object} opt_obj The object to be used as the value of 'this' within
 *     {@code f}.
 * @return {goog.iter.Iterator} A new iterator that returns the results of
 *     applying the function to each element in the original iterator.
 */
goog.iter.map = function(iterable, f, opt_obj) {
  iterable = goog.iter.toIterator(iterable);
  var newIter = new goog.iter.Iterator;
  newIter.next = function() {
    while (true) {
      var val = iterable.next();
      return f.call(opt_obj, val, undefined, iterable);
    }
  };
  return newIter;
};


/**
 * Passes every element of an iterator into a function and accumulates the
 * result.
 *
 * @param {goog.iter.Iterator} iterable The iterator to iterate over.
 * @param {Function} f The function to call for every element. This function
 *     takes 2 arguments (the function's previous result or the initial value,
 *     and the value of the current element).
 *     function(previousValue, currentElement) : newValue.
 * @param {*} val The initial value to pass into the function on the first call.
 * @param {Object} opt_obj  The object to be used as the value of 'this'
 *     within f.
 * @return {*} Result of evaluating f repeatedly across the values of
 *     the iterator.
 */
goog.iter.reduce = function(iterable, f, val, opt_obj) {
  var rval = val;
  goog.iter.forEach(iterable, function(val) {
    rval = f.call(opt_obj, rval, val);
  });
  return rval;
};


/**
 * Goes through the values in the iterator. Calls f for each these and if any of
 * them returns true, this returns true (without checking the rest). If all
 * return false this will return false.
 *
 * @param {goog.iter.Iterator} iterable  The iterator object.
 * @param {Function} f  The function to call for every value. This function
 *     takes 3 arguments (the value, undefined, and the iterator) and should
 *     return a boolean.
 * @param {Object} opt_obj The object to be used as the value of 'this' within
 *     {@code f}.
 * @return {boolean} true if any value passes the test.
 */
goog.iter.some = function(iterable, f, opt_obj) {
  iterable = goog.iter.toIterator(iterable);
  /** @preserveTry */
  try {
    while (true) {
      if (f.call(opt_obj, iterable.next(), undefined, iterable)) {
        return true;
      }
    }
  } catch (ex) {
    if (ex !== goog.iter.StopIteration) {
      throw ex;
    }
  }
  return false;
};


/**
 * Goes through the values in the iterator. Calls f for each these and if any of
 * them returns false this returns false (without checking the rest). If all
 * return true this will return true.
 *
 * @param {goog.iter.Iterator} iterable  The iterator object.
 * @param {Function} f  The function to call for every value. This function
 *     takes 3 arguments (the value, undefined, and the iterator) and should
 *     return a boolean.
 * @param {Object} opt_obj The object to be used as the value of 'this' within
 *     {@code f}.
 * @return {boolean} true if every value passes the test.
 */
goog.iter.every = function(iterable, f, opt_obj) {
  iterable = goog.iter.toIterator(iterable);
  /** @preserveTry */
  try {
    while (true) {
      if (!f.call(opt_obj, iterable.next(), undefined, iterable)) {
        return false;
      }
    }
  } catch (ex) {
    if (ex !== goog.iter.StopIteration) {
      throw ex;
    }
  }
  return true;
};


/**
 * Takes zero or more iterators and returns one iterator that will iterate over
 * them in the order chained.
 * @param {goog.iter.Iterator} var_args  Any number of iterator objects.
 * @return {goog.iter.Iterator} Returns a new iterator that will iterate over
 *     all the given iterators' contents.
 */
goog.iter.chain = function(var_args) {
  var args = arguments;
  var length = args.length;
  var i = 0;
  var newIter = new goog.iter.Iterator;
  newIter.next = function() {
    /** @preserveTry */
    try {
      if (i >= length) {
        throw goog.iter.StopIteration;
      }
      var current = goog.iter.toIterator(args[i]);
      return current.next();
    } catch (ex) {
      if (ex !== goog.iter.StopIteration || i >= length) {
        throw ex;
      } else {
        // In case we got a StopIteration increment counter and try again.
        i++;
        return this.next();
      }
    }
  };
  return newIter;
};


/**
 * Builds a new iterator that iterates over the original, but skips elements as
 * long as a supplied function returns true.
 * @param {goog.iter.Iterator} iterable  The iterator object.
 * @param {Function} f  The function to call for every value. This function
 *     takes 3 arguments (the value, undefined, and the iterator) and should
 *     return a boolean.
 * @param {Object} opt_obj The object to be used as the value of 'this' within
 *     {@code f}.
 * @return {goog.iter.Iterator} A new iterator that drops elements from the
 *     original iterator as long as {@code f} is true.
 */
goog.iter.dropWhile = function(iterable, f, opt_obj) {
  iterable = goog.iter.toIterator(iterable);
  var newIter = new goog.iter.Iterator;
  var dropping = true;
  newIter.next = function() {
    while (true) {
      var val = iterable.next();
      if (dropping && f.call(opt_obj, val, undefined, iterable)) {
        continue;
      } else {
        dropping = false;
      }
      return val;
    }
  };
  return newIter;
};


/**
 * Builds a new iterator that iterates over the original, but only as long as a
 * supplied function returns true.
 * @param {goog.iter.Iterator} iterable  The iterator object.
 * @param {Function} f  The function to call for every value. This function
 *     takes 3 arguments (the value, undefined, and the iterator) and should
 *     return a boolean.
 * @param {Object} opt_obj This is used as the 'this' object in f when called.
 * @return {goog.iter.Iterator} A new iterator that keeps elements in the
 *     original iterator as long as the function is true.
 */
goog.iter.takeWhile = function(iterable, f, opt_obj) {
  iterable = goog.iter.toIterator(iterable);
  var newIter = new goog.iter.Iterator;
  var taking = true;
  newIter.next = function() {
    while (true) {
      if (taking) {
        var val = iterable.next();
        if (f.call(opt_obj, val, undefined, iterable)) {
          return val;
        } else {
          taking = false;
        }
      } else {
        throw goog.iter.StopIteration;
      }
    }
  };
  return newIter;
};


/**
 * Converts the iterator to an array
 * @param {goog.iter.Iterator} iterable  The iterator to convert to an array.
 * @return {Array} An array of the elements the iterator iterates over.
 */
goog.iter.toArray = function(iterable) {
  // Fast path for array-like.
  if (goog.isArrayLike(iterable)) {
    return goog.array.toArray(iterable);
  }
  iterable = goog.iter.toIterator(iterable);
  var array = [];
  goog.iter.forEach(iterable, function(val) {
    array.push(val);
  });
  return array;
};


/**
 * Iterates over 2 iterators and returns true if they contain the same sequence
 * of elements and have the same length.
 * @param {goog.iter.Iterator} iterable1  The first iterable object.
 * @param {goog.iter.Iterator} iterable2  The second iterable object.
 * @return {boolean} true if the iterators contain the same sequence of
 *     elements and have the same length.
 */
goog.iter.equals = function(iterable1, iterable2) {
  iterable1 = goog.iter.toIterator(iterable1);
  iterable2 = goog.iter.toIterator(iterable2);
  var b1, b2;
  /** @preserveTry */
  try {
    while (true) {
      b1 = b2 = false;
      var val1 = iterable1.next();
      b1 = true;
      var val2 = iterable2.next();
      b2 = true;
      if (val1 != val2) {
        return false;
      }
    }
  } catch (ex) {
    if (ex !== goog.iter.StopIteration) {
      throw ex;
    } else {
      if (b1 && !b2) {
        // iterable1 done but iterable2 is not done.
        return false;
      }
      if (!b2) {
        /** @preserveTry */
        try {
          // iterable2 not done?
          val2 = iterable2.next();
          // iterable2 not done but iterable1 is done
          return false;
        } catch (ex) {
          if (ex !== goog.iter.StopIteration) {
            throw ex;
          }
          // iterable2 done as well... They are equal
          return true;
        }
      }
    }
  }
  return false;
};


/**
 * Advances the iterator to the next position, returning the given default value
 * instead of throwing an exception if the iterator has no more entries.
 * @param {goog.iter.Iterator|Object} iterable The iterable object.
 * @param {*} defaultValue The value to return if the iterator is empty.
 * @return {*} The next item in the iteration, or defaultValue if the iterator
 *     was empty.
 */
goog.iter.nextOrValue = function(iterable, defaultValue) {
  try {
    return goog.iter.toIterator(iterable).next();
  } catch (e) {
    if (e != goog.iter.StopIteration) {
      throw e;
    }
    return defaultValue;
  }
};

// Copyright 2006 Google Inc.
// All Rights Reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 
//  * Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
//  * Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in
//    the documentation and/or other materials provided with the
//    distribution.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
// INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
// BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
// LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
// ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE. 

/**
 * @fileoverview Datastructure: Hash Map.
 *
 *
 * This file contains an implementation of a Map structure. It implements a lot
 * of the methods used in goog.structs so those functions work on hashes.  For
 * convenience with common usage the methods accept any type for the key, though
 * internally they will be cast to strings.
 */


goog.provide('goog.structs.Map');
goog.provide('goog.structs.Map.Entry');

goog.require('goog.iter.Iterator');
goog.require('goog.iter.StopIteration');
goog.require('goog.object');
goog.require('goog.structs');


/**
 * Class for Hash Map datastructure.
 * @param {Object} opt_map Map or Object to initialize the map with.
 * @param {Object} var_args If 2 or more arguments are present then they will be
 *     used as key-value pairs.
 * @constructor
 */
goog.structs.Map = function(opt_map, var_args) {

  /**
   * Underlying JS object used to implement the map.
   * @type {Object}
   */
  this.map_ = {};

  /**
   * An array of keys. This is necessary for two reasons:
   *   1. Iterating the keys using for (var key in this.map_) allocates an
   *      object for every key in IE which is really bad for IE6 GC perf.
   *   2. Without a side data structure, we would need to escape all the keys
   *      as that would be the only way we could tell during iteration if the
   *      key was an internal key or a property of the object.
   *
   * This array can contain deleted keys so it's necessary to check the map
   * as well to see if the key is still in the map (this doesn't require a
   * memory allocation in IE).
   * @type {Array.<string>}
   * @private
   */
  this.keys_ = [];

  var argLength = arguments.length;

  if (argLength > 1) {
    if (argLength % 2) {
      throw Error('Uneven number of arguments');
    }
    for (var i = 0; i < argLength; i += 2) {
      this.set(arguments[i], arguments[i + 1]);
    }
  } else if (opt_map) {
    this.addAll(opt_map);
  }
};


/**
 * The number of key value pairs in the map.
 * @private
 * @type {number}
 */
goog.structs.Map.prototype.count_ = 0;


/**
 * Version used to detect changes while iterating.
 * @private
 * @type {number}
 */
goog.structs.Map.prototype.version_ = 0;

/**
 * @return {number} The number of key-value pairs in the map.
 */
goog.structs.Map.prototype.getCount = function() {
  return this.count_;
};


/**
 * Returns the values of the map.
 * @return {Array} The values in the map.
 */
goog.structs.Map.prototype.getValues = function() {
  this.cleanupKeysArray_();

  var rv = [];
  for (var i = 0; i < this.keys_.length; i++) {
    var key = this.keys_[i];
    rv.push(this.map_[key]);
  }
  return rv;
};


/**
 * Returns the keys of the map.
 * @return {Array.<string>} Array of string values.
 */
goog.structs.Map.prototype.getKeys = function() {
  this.cleanupKeysArray_();
  return this.keys_.concat();
};


/**
 * Whether the map contains the given key.
 * @param {*} key The key to check for.
 * @return {boolean} Whether the map contains the key.
 */
goog.structs.Map.prototype.containsKey = function(key) {
  return goog.structs.Map.hasKey_(this.map_, key);
};


/**
 * Whether the map contains the given value. This is O(n).
 * @param {*} val The value to check for.
 * @return {boolean} Whether the map contains the value.
 */
goog.structs.Map.prototype.containsValue = function(val) {
  for (var i = 0; i < this.keys_.length; i++) {
    var key = this.keys_[i];
    if (goog.structs.Map.hasKey_(this.map_, key) && this.map_[key] == val) {
      return true;
    }
  }
  return false;
};


/**
 * Whether this map is equal to the argument map.
 * @param {goog.structs.Map} otherMap The map against which to test equality.
 * @param {function(*, *) : boolean} opt_equalityFn Optional equality function
 *     to test equality of values. If not specified, this will test whether
 *     the values contained in each map are identical objects.
 * @return {boolean} Whether the maps are equal.
 */
goog.structs.Map.prototype.equals = function(otherMap, opt_equalityFn) {
  if (this === otherMap) {
    return true;
  }

  if (this.count_ != otherMap.getCount()) {
    return false;
  }

  var equalityFn = opt_equalityFn || goog.structs.Map.defaultEquals;

  this.cleanupKeysArray_();
  for (var key, i = 0; key = this.keys_[i]; i++) {
    if (!equalityFn(this.get(key), otherMap.get(key))) {
      return false;
    }
  }

  return true;
};


/**
 * Default equality test for values.
 * @param {*} a The first value.
 * @param {*} b The second value.
 * @return {boolean} Whether a and b reference the same object.
 */
goog.structs.Map.defaultEquals = function(a, b) {
  return a === b;
};


/**
 * @return {boolean} Whether the map is empty.
 */
goog.structs.Map.prototype.isEmpty = function() {
  return this.count_ == 0;
};


/**
 * Removes all key-value pairs from the map.
 */
goog.structs.Map.prototype.clear = function() {
  this.map_ = {};
  this.keys_.length = 0;
  this.count_ = 0;
  this.version_ = 0;
};

/**
 * Removes a key-value pair based on the key. This is O(logN) amortized due to
 * updating the keys array whenever the count becomes half the size of the keys
 * in the keys array.
 * @param {*} key  The key to remove.
 * @return {boolean} Whether object was removed.
 */
goog.structs.Map.prototype.remove = function(key) {
  if (goog.structs.Map.hasKey_(this.map_, key)) {
    delete this.map_[key];
    this.count_--;
    this.version_++;

    // clean up the keys array if the threshhold is hit
    if (this.keys_.length > 2 * this.count_) {
      this.cleanupKeysArray_();
    }

    return true;
  }
  return false;
};


/**
 * Cleans up the temp keys array by removing entries that are no longer in the
 * map.
 * @private
 */
goog.structs.Map.prototype.cleanupKeysArray_ = function() {
  if (this.count_ != this.keys_.length) {
    // First remove keys that are no longer in the map.
    var srcIndex = 0;
    var destIndex = 0;
    while (srcIndex < this.keys_.length) {
      var key = this.keys_[srcIndex];
      if (goog.structs.Map.hasKey_(this.map_, key)) {
        this.keys_[destIndex++] = key;
      }
      srcIndex++;
    }
    this.keys_.length = destIndex;
  }

  if (this.count_ != this.keys_.length) {
    // If the count still isn't correct, that means we have duplicates. This can
    // happen when the same key is added and removed multiple times. Now we have
    // to allocate one extra Object to remove the duplicates. This could have
    // been done in the first pass, but in the common case, we can avoid
    // allocating an extra object by only doing this when necessary.
    var seen = {};
    var srcIndex = 0;
    var destIndex = 0;
    while (srcIndex < this.keys_.length) {
      var key = this.keys_[srcIndex];
      if (!(goog.structs.Map.hasKey_(seen, key))) {
        this.keys_[destIndex++] = key;
        seen[key] = 1;
      }
      srcIndex++;
    }
    this.keys_.length = destIndex;
  }
};


/**
 * Returns the value for the given key.  If the key is not found and the default
 * value is not given this will return {@code undefined}.
 * @param {*} key The key to get the value for.
 * @param {*} opt_val The value to return if no item is found for the given key,
 *     defaults to undefined.
 * @return {*} The value for the given key.
 */
goog.structs.Map.prototype.get = function(key, opt_val) {
  if (goog.structs.Map.hasKey_(this.map_, key)) {
    return this.map_[key];
  }
  return opt_val;
};


/**
 * Adds a key-value pair to the map.
 * @param {*} key The key.
 * @param {*} value The value to add.
 */
goog.structs.Map.prototype.set = function(key, value) {
  if (!(goog.structs.Map.hasKey_(this.map_, key))) {
    this.count_++;
    this.keys_.push(key);
    // Only change the version if we add a new key.
    this.version_++;
  }
  this.map_[key] = value;
};


/**
 * Adds multiple key-value pairs from another goog.structs.Map or Object.
 * @param {Object} map  Object containing the data to add.
 */
goog.structs.Map.prototype.addAll = function(map) {
  var keys, values;
  if (map instanceof goog.structs.Map) {
    keys = map.getKeys();
    values = map.getValues();
  } else {
    keys = goog.object.getKeys(map);
    values = goog.object.getValues(map);
  }
  // we could use goog.array.forEach here but I don't want to introduce that
  // dependency just for this.
  for (var i = 0; i < keys.length; i++) {
    this.set(keys[i], values[i]);
  }
};


/**
 * Clones a map and returns a new map.
 * @return {goog.structs.Map} A new map with the same key-value pairs.
 */
goog.structs.Map.prototype.clone = function() {
  return new goog.structs.Map(this);
};


/**
 * Returns a new map in which all the keys and values are interchanged
 * (keys become values and values become keys). If multiple keys map to the
 * same value, the chosen transposed value is implementation-dependent.
 *
 * It acts very similarly to {goog.object.transpose(Object)}.
 *
 * @return {goog.structs.Map} The transposed map.
 */
goog.structs.Map.prototype.transpose = function() {
  var transposed = new goog.structs.Map();
  for (var i = 0; i < this.keys_.length; i++) {
    var key = this.keys_[i];
    var value = this.map_[key];
    transposed.set(value, key);
  }

  return transposed;
};


/**
 * Returns an iterator that iterates over the keys in the map.  Removal of keys
 * while iterating might have undesired side effects.
 * @return {goog.iter.Iterator} An iterator over the keys in the map.
 */
goog.structs.Map.prototype.getKeyIterator = function() {
  return this.__iterator__(true);
};


/**
 * Returns an iterator that iterates over the values in the map.  Removal of
 * keys while iterating might have undesired side effects.
 * @return {goog.iter.Iterator} An iterator over the values in the map.
 */
goog.structs.Map.prototype.getValueIterator = function() {
  return this.__iterator__(false);
};


/**
 * Returns an iterator that iterates over the values or the keys in the map.
 * This throws an exception if the map was mutated since the iterator was
 * created.
 * @param {boolean} opt_keys True to iterate over the keys. False to iterate
 *     over the values.  The default value is false.
 * @return {goog.iter.Iterator} An iterator over the values or keys in the map.
 */
goog.structs.Map.prototype.__iterator__ = function(opt_keys) {
  // Clean up keys to minimize the risk of iterating over dead keys.
  this.cleanupKeysArray_();

  var i = 0;
  var keys = this.keys_;
  var map = this.map_;
  var version = this.version_;
  var selfObj = this;

  var newIter = new goog.iter.Iterator;
  newIter.next = function() {
    while (true) {
      if (version != selfObj.version_) {
        throw Error('The map has changed since the iterator was created');
      }
      if (i >= keys.length) {
        throw goog.iter.StopIteration;
      }
      var key = keys[i++];
      return opt_keys ? key : map[key];
    }
  };
  return newIter;
};


/**
 * Safe way to test for hasOwnProperty.  It even allows testing for
 * 'hasOwnProperty'.
 * @param {Object} obj The object to test for presence of the given key.
 * @param {*} key The key to check for.
 * @return {boolean} Whether the object has the key.
 * @private
 */
goog.structs.Map.hasKey_ = function(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
};

// Added by mbolin.

/**
 * @param {*} key
 * @param [*} value
 */
goog.structs.Map.Entry = function(key, value) {
  /**
   * @type {*}
   */
  this.key = key;

  /**
   * @type {*}
   */
  this.value = value;
};


/**
 * @return {Array.<goog.structs.Map.Entry>}
 */
goog.structs.Map.prototype.getEntries = function() {
  var entries = [];
  var keys = this.getKeys();
  for (var i = 0; i < keys.length; ++i) {
    entries.push(new goog.structs.Map.Entry(keys[i], this.get(keys[i])));
  }
  return entries;
};

// Copyright 2006 Google Inc.
// All Rights Reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 
//  * Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
//  * Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in
//    the documentation and/or other materials provided with the
//    distribution.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
// INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
// BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
// LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
// ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE. 

/**
 * @fileoverview Datastructure: Set.
 *
 *
 * This class implements a set data structure. Adding and removing is O(1). It
 * supports both object and primitive values. Be careful because you can add
 * both 1 and new Number(1), beacuse these are not the same. You can even add
 * multiple new Number(1) because these are not equal.
 */


goog.provide('goog.structs.Set');

goog.require('goog.structs');
goog.require('goog.structs.Map');


/**
 * Class for Set datastructure.
 *
 * @param {Array|Object} opt_values Initial values to start with.
 * @constructor
 */
goog.structs.Set = function(opt_values) {
  this.map_ = new goog.structs.Map;
  if (opt_values) {
    this.addAll(opt_values);
  }
};


/**
 * This is used to get the key or the hash. We are not using getHashCode
 * because it only works with objects.
 * @param {*} val Object or primitive value to get a key for.
 * @return {string} A unique key for this value/object.
 * @private
 */
goog.structs.Set.getKey_ = function(val) {
  var type = typeof val;
  if (type == 'object') {
    return 'o' + goog.getHashCode(/** @type {Object} */ (val));
  } else {
    return type.substr(0, 1) + val;
  }
};


/**
 * @return {number} The number of objects in the Set.
 */
goog.structs.Set.prototype.getCount = function() {
  return this.map_.getCount();
};


/**
 * Add an object to the set.
 * @param {*} obj The object to add.
 */
goog.structs.Set.prototype.add = function(obj) {
  this.map_.set(goog.structs.Set.getKey_(obj), obj);
};


/**
 * Adds all objects from one goog.structs.Set to the current one. This can
 * take an array as well.
 * @param {Array|Object} set The set or array to add objects from.
 */
goog.structs.Set.prototype.addAll = function(set) {
  var values = goog.structs.getValues(set);
  var l = values.length;
  for (var i = 0; i < l; i++) {
    this.add(values[i]);
  }
};


/**
 * Removes all objects in one goog.structs.Set from the current one. This can
 * take an array as well.
 * @param {Array|Object} set The set or array to remove objects from.
 */
goog.structs.Set.prototype.removeAll = function(set) {
  var values = goog.structs.getValues(set);
  var l = values.length;
  for (var i = 0; i < l; i++) {
    this.remove(values[i]);
  }
};


/**
 * Removes an object from the set.
 * @param {*} obj The object to remove.
 * @return {boolean} Whether object was removed.
 */
goog.structs.Set.prototype.remove = function(obj) {
  return this.map_.remove(goog.structs.Set.getKey_(obj));
};


/**
 * Removes all objects from the set.
 */
goog.structs.Set.prototype.clear = function() {
  this.map_.clear();
};


/**
 * Removes all objects from the set.
 * @return {boolean} True if there are no objects in the goog.structs.Set.
 */
goog.structs.Set.prototype.isEmpty = function() {
  return this.map_.isEmpty();
};


/**
 * Whether the goog.structs.Set contains an object or not.
 * @param {*} obj The object to test for.
 * @return {boolean} True if the set contains the object.
 */
goog.structs.Set.prototype.contains = function(obj) {
  return this.map_.containsKey(goog.structs.Set.getKey_(obj));
};


/**
 * Whether the goog.structs.Set contains all elements of the collection.
 * Ignores identical elements, e.g. set([1, 2]) contains [1, 1].
 * @param {Object} col A collection-like object.
 * @return {boolean} True if the set contains all elements.
 */
goog.structs.Set.prototype.containsAll = function(col) {
  return goog.structs.every(col, this.contains, this);
};


/**
 * Find all elements present in both of 2 sets.
 * @param {Array|Object} set The set or array to test against.
 * @return {goog.structs.Set} A new set containing all elements present in both
 *     this object and specified set.
 */
goog.structs.Set.prototype.intersection = function(set) {
  var result = new goog.structs.Set();

  var values = goog.structs.getValues(set);
  for (var i = 0; i < values.length; i++) {
    var value = values[i];
    if (this.contains(value)) {
      result.add(value);
    }
  }

  return result;
};


/**
 * Inserts the objects in the set into a new Array.
 * @return {Array} An array of all the values in the Set.
 */
goog.structs.Set.prototype.getValues = function() {
  return this.map_.getValues();
};


/**
 * Does a shallow clone of the goog.structs.Set.
 * @return {goog.structs.Set} The cloned Set.
 */
goog.structs.Set.prototype.clone = function() {
  return new goog.structs.Set(this);
};


/**
 * Compares this set with the input collection for equality.
 * Its time complexity is O(|col|) and uses equals (==) to test the existence
 * of the elements.
 * @param {Object} col A collection-like object.
 * @return {boolean} True if the collection consists of the same elements as
 *     the set in arbitrary order.
 */
goog.structs.Set.prototype.equals = function(col) {
  return this.getCount() == goog.structs.getCount(col) && this.isSubsetOf(col);
};


/**
 * Decides if the input collection contains all elements of this set.
 * Its time complexity is O(|col|) and uses equals (==) to test the existence
 * of the elements.
 * @param {Object} col A collection-like object.
 * @return {boolean} True if the set is a subset of the collection.
 */
goog.structs.Set.prototype.isSubsetOf = function(col) {
  var colCount = goog.structs.getCount(col);
  if (this.getCount() > colCount) {
    return false;
  }
  if (!(col instanceof goog.structs.Set) && colCount > 5) {
    // Make the goog.structs.contains(col, value) faster if necessary.
    col = new goog.structs.Set(col);
  }
  return goog.structs.every(this, function(value) {
    return goog.structs.contains(col, value);
  });
};


/**
 * Returns an iterator that iterates over the elements in the set.
 * @param {boolean} opt_keys Ignored for sets.
 * @return {goog.iter.Iterator} An iterator over the elements in the set.
 */
goog.structs.Set.prototype.__iterator__ = function(opt_keys) {
  return this.map_.__iterator__(false);
};


/**
 * The number of keys in the set.
 * @param {Object} col The collection-like object.
 * @return {number} The number of keys in the set.
 *
 * @deprecated Use the instance {@code getCount} method on your object instead.
 */
goog.structs.Set.getCount = function(col) {
  return goog.structs.getCount(col);
};


/**
 * Returns the values of the set.
 * @param {Object} col A collection-like object.
 * @return {Array} The values in the collection-like object.
 *
 * @deprecated Use the instance {@code getValues} method on your object instead.
 */
goog.structs.Set.getValues = function(col) {
  return goog.structs.getValues(col);
};


/**
 * Whether the collection contains the given value. This is O(n) and uses
 * equals (==) to test the existence.
 * @param {Object} col A collection-like object.
 * @param {Object} val The value to check for.
 * @return {boolean} True if the collection-like object contains the value.
 *
 * @deprecated Use the instance {@code contains} method on your object instead.
 */
goog.structs.Set.contains = function(col, val) {
  return goog.structs.contains(col, val);
};


/**
 * Whether the collection is empty.
 * @param {Object} col The collection-like object.
 * @return {boolean} True if empty.
 *
 * @deprecated Use the instance {@code isEmpty} method on your object instead.
 */
goog.structs.Set.isEmpty = function(col) {
  return goog.structs.isEmpty(col);
};


/**
 * Removes all the elements from the collection.
 * @param {Object} col The collection-like object.
 *
 * @deprecated Use the instance {@code clear} method on your object instead.
 */
goog.structs.Set.clear = function(col) {
  goog.structs.clear(col);
};


/**
 * Removes a value from a collection. This is O(n) in some implementations
 * and then uses equal (==) to find the element.
 * @param {Object} col A collection-like object.
 * @param {*} val The element to remove.
 * @return {boolean} Whether an element was removed.
 *
 * @deprecated Use the instance {@code remove} method on your object instead.
 */
goog.structs.Set.remove = function(col, val) {
  if (typeof col.remove == 'function') {
    return col.remove(val);
  } else if (goog.isArrayLike(col)) {
    return goog.array.remove(/** @type {Array} */ (col), val);
  } else {
    // this removes based on value not on key.
    var l = col.length;
    for (var key in col) {
      if (col[key] == val) {
        delete col[key];
        return true;
      }
    }
    return false;
  }
};


/**
 * Adds a value to the collection.
 *
 * @throws {Exception} If the collection does not have an add method or is not
 *     array-like.
 *
 * @param {Object} col The collection-like object.
 * @param {*} val The value to add.
 *
 * @deprecated Use the instance {@code add} method on your object instead.
 */
goog.structs.Set.add = function(col, val) {
  if (typeof col.add == 'function') {
    col.add(val);
  } else if (goog.isArrayLike(col)) {
    col[col.length] = val; // don't use push because push is not a requirement
                           // for an object to be array like
  } else {
    throw Error('The collection does not know how to add "' + val + '"');
  }
};

// Copyright 2007 Google Inc.
// All Rights Reserved.
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 
//  * Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
//  * Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in
//    the documentation and/or other materials provided with the
//    distribution.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
// INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
// BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
// LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
// ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE. 

/**
 * @fileoverview Datastructure: Pool.
 *
 *
 * A generic class for handling pools of objects that is more efficient than
 * goog.structs.Pool because it doesn't maintain a list of objects that are in
 * use. See constructor comment.
 */


goog.provide('goog.structs.SimplePool');

goog.require('goog.Disposable');


/**
 * A generic pool class. Simpler and more efficient than goog.structs.Pool
 * because it doesn't maintain a list of objects that are in use. This class
 * has constant overhead and doesn't create any additional objects as part of
 * the pool management after construction time.
 *
 * IMPORTANT: If the objects being pooled are arrays or maps that can have
 * unlimited number of properties, they need to be cleaned before being
 * returned to the pool.
 *
 * Also note that {@see goog.object.clean} actually allocates an array to clean
 * the object passed to it, so simply using this function would defy the
 * purpose of using the pool.
 *
 * @param {number} initialCount Initial number of objects to populate the
 *     free pool at construction time.
 * @param {number} maxCount Maximum number of objects to keep in the free pool.
 * @constructor
 * @extends {goog.Disposable}
 *
 */
goog.structs.SimplePool = function(initialCount, maxCount) {
  goog.Disposable.call(this);

  /**
   * Maximum number of objects allowed
   * @type {number}
   * @private
   */
  this.maxCount_ = maxCount;

  /**
   * Queue used to store objects that are currently in the pool and available
   * to be used.
   * @type {Array}
   * @private
   */
  this.freeQueue_ = [];

  this.createInitial_(initialCount);
};
goog.inherits(goog.structs.SimplePool, goog.Disposable);


/**
 * Function for overriding createObject. The avoids a common case requiring
 * subclassing this class.
 * @type {Function?}
 * @private
 */
goog.structs.SimplePool.prototype.createObjectFn_ = null;


/**
 * Function for overriding disposeObject. The avoids a common case requiring
 * subclassing this class.
 * @type {Function?}
 * @private
 */
goog.structs.SimplePool.prototype.disposeObjectFn_ = null;


/**
 * Sets the {@code createObject} function which is used for creating a new
 * object in the pool.
 * @param {Function} createObjectFn Create object function which returns the
 *     newly createrd object.
 */
goog.structs.SimplePool.prototype.setCreateObjectFn = function(createObjectFn) {
  this.createObjectFn_ = createObjectFn;
};


/**
 * Sets the {@code disposeObject} function which is used for disposing of an
 * object in the pool.
 * @param {Function} disposeObjectFn Dispose object function which takes the
 *     object to dispose as a parameter.
 */
goog.structs.SimplePool.prototype.setDisposeObjectFn = function(
    disposeObjectFn) {
  this.disposeObjectFn_ = disposeObjectFn;
};


/**
 * Gets a new object from the the pool, if there is one available, otherwise
 * returns null.
 * @return {Object} An object from the pool or a new one if necessary.
 */
goog.structs.SimplePool.prototype.getObject = function() {
  if (this.freeQueue_.length) {
    return this.freeQueue_.pop();
  }
  return this.createObject();
};


/**
 * Releases the space in the pool held by a given object -- i.e., remove it from
 * the pool and frees up its space.
 * @param {Object} obj The object to release.
 */
goog.structs.SimplePool.prototype.releaseObject = function(obj) {
  if (this.freeQueue_.length < this.maxCount_) {
    this.freeQueue_.push(obj);
  } else {
    this.disposeObject(obj);
  }
};


/**
 * Populates the pool with initialCount objects.
 * @param {number} initialCount The number of objects to add to the pool.
 * @private
 */
goog.structs.SimplePool.prototype.createInitial_ = function(initialCount) {
  if (initialCount > this.maxCount_) {
    throw Error('[goog.structs.SimplePool] Initial cannot be greater than max');
  }
  for (var i = 0; i < initialCount; i++) {
    this.freeQueue_.push(this.createObject());
  }
};


/**
 * Should be overriden by sub-classes to return an instance of the object type
 * that is expected in the pool.
 * @return {Object} The created object.
 */
goog.structs.SimplePool.prototype.createObject = function() {
  if (this.createObjectFn_) {
    return this.createObjectFn_();
  } else {
    return {};
  }
};


/**
 * Should be overriden to dispose of an object. Default implementation is to
 * remove all of the object's members, which should render it useless. Calls the
 *  object's dispose method, if available.
 * @param {Object} obj The object to dispose.
 */
goog.structs.SimplePool.prototype.disposeObject = function(obj) {
  if (this.disposeObjectFn_) {
    this.disposeObjectFn_(obj);
  } else {
    if (goog.isFunction(obj.dispose)) {
      obj.dispose();
    } else {
      for (var i in obj) {
        delete obj[i];
      }
    }
  }
};


/**
 * Disposes of the pool and all objects currently held in the pool.
 */
goog.structs.SimplePool.prototype.disposeInternal = function() {
  goog.structs.SimplePool.superClass_.disposeInternal.call(this);
  // Call disposeObject on each object held by the pool.
  var freeQueue = this.freeQueue_;
  while (freeQueue.length) {
    this.disposeObject(freeQueue.pop());
  }
  delete this.freeQueue_;
};

// Copyright 2005 Google Inc. All Rights Reserved
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 
//  * Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
//  * Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in
//    the documentation and/or other materials provided with the
//    distribution.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
// INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
// BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
// LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
// ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE. 

/**
 * @fileoverview Event Manager.
 *
 * Provides an abstracted interface to the browsers' event
 * systems. Based on Aaron's listen(), this uses an indirect lookup of listener
 * functions to avoid circular references between DOM (in IE) or XPCOM
 * (in Mozilla) objects which leak memory. This makes it easier to write OO
 * Javascript/DOM code.
 *
 * It simulates capture & bubble in Internet Explorer.
 *
 * The listeners will also automagically have their event objects patched, so
 * your handlers don't need to worry about the browser.
 *
 * Example usage:
 * <pre>
 * goog.events.listen(myNode, 'click', function(e) { alert('woo') });
 * goog.events.listen(myNode, 'mouseover', mouseHandler, true);
 * goog.events.unlisten(myNode, 'mouseover', mouseHandler, true);
 * goog.events.removeAll(myNode);
 * goog.events.removeAll();
 * </pre>
 *
 * @supported IE6, IE7, FF1.5+, Safari, Opera 9 (key codes are problematic in
 * Safari and Opera, preventDefault is also not properly patched in Safari).
 */


// This uses 3 lookup tables/trees.
// listenerTree_ is a tree of type -> capture -> src hash code -> [Listener]
// listeners_ is a map of key -> [Listener]
//
// The key is a field of the Listener. The Listener class also has the type,
// capture and the src so one can always trace back in the tree
//
// sources_: src hc -> [Listener]


goog.provide('goog.events');
goog.provide('goog.events.EventType');

goog.require('goog.array');
goog.require('goog.events.BrowserEvent');
goog.require('goog.events.Event');
goog.require('goog.events.Listener');
goog.require('goog.object');
goog.require('goog.structs.SimplePool');
goog.require('goog.userAgent');


/**
 * Container for storing event listeners and their proxies
 * @private
 * @type {Object}
 */
goog.events.listeners_ = {};


/**
 * The root of the listener tree
 * @private
 * @type {Object}
 */
goog.events.listenerTree_ = {};


/**
 * Lookup for mapping source hash codes to listeners
 * @private
 * @type {Object}
 */
goog.events.sources_ = {};


/**
 * Initial count for the objectPool_
 * @type {number}
 */
goog.events.OBJECT_POOL_INITIAL_COUNT = 0;


/**
 * Max count for the objectPool_
 * @type {number}
 */
goog.events.OBJECT_POOL_MAX_COUNT = 600;


/**
 * SimplePool to cache the lookup objects. This was implemented to make IE6
 * performance better and removed an object allocation in goog.events.listen
 * when in steady state.
 * @type {goog.structs.SimplePool}
 * @private
 */
goog.events.objectPool_ = new goog.structs.SimplePool(
    goog.events.OBJECT_POOL_INITIAL_COUNT,
    goog.events.OBJECT_POOL_MAX_COUNT);


// Override to add the count_ fields
goog.events.objectPool_.setCreateObjectFn(function() {
  return {count_: 0, remaining_: 0};
});


// Override dispose method to prevent for in loop.
goog.events.objectPool_.setDisposeObjectFn(function(obj) {
  obj.count_ = 0;
  // No need to reset remaining_ since it is always reset before it is used.
});


/**
 * Initial count for the arrayPool_
 * @type {number}
 */
goog.events.ARRAY_POOL_INITIAL_COUNT = 0;


/**
 * Max count for the arrayPool_
 * @type {number}
 */
goog.events.ARRAY_POOL_MAX_COUNT = 600;


/**
 * SimplePool to cache the type arrays. This was implemented to make IE6
 * performance better and removed an object allocation in goog.events.listen
 * when in steady state.
 * @type {goog.structs.SimplePool}
 * @private
 */
goog.events.arrayPool_ = new goog.structs.SimplePool(
    goog.events.ARRAY_POOL_INITIAL_COUNT,
    goog.events.ARRAY_POOL_MAX_COUNT);


// Override create function to return an array.
goog.events.arrayPool_.setCreateObjectFn(function() {
  return [];
});


// Override dispose method to prevent for in loop.
goog.events.arrayPool_.setDisposeObjectFn(function(obj) {
  obj.length = 0;
  delete obj.locked_;
  delete obj.needsCleanup_;
});


/**
 * Initial count for the handleEventProxyPool_
 * @type {number}
 */
goog.events.HANDLE_EVENT_PROXY_POOL_INITIAL_COUNT = 0;


/**
 * Max count for the handleEventProxyPool_
 * @type {number}
 */
goog.events.HANDLE_EVENT_PROXY_POOL_MAX_COUNT = 600;


/**
 * SimplePool to cache the handle event proxy. This was implemented to make IE6
 * performance better and removed an object allocation in goog.events.listen
 * when in steady state.
 * @type {goog.structs.SimplePool}
 * @private
 */
goog.events.handleEventProxyPool_ = new goog.structs.SimplePool(
    goog.events.HANDLE_EVENT_PROXY_POOL_INITIAL_COUNT,
    goog.events.HANDLE_EVENT_PROXY_POOL_MAX_COUNT);
goog.events.handleEventProxyPool_.setCreateObjectFn(function() {
  // Use a local var f to prevent one allocation.
  var f = function(eventObject) {
    return goog.events.handleBrowserEvent_.call(f.src, f.key, eventObject);
  };
  return f;
});


/**
 * Initial count for the listenerPool_
 * @type {number}
 */
goog.events.LISTENER_POOL_INITIAL_COUNT = 0;


/**
 * Max count for the listenerPool_
 * @type {number}
 */
goog.events.LISTENER_POOL_MAX_COUNT = 600;


/**
 * Function for creating a listener for goog.events.listenerPool_. This could
 * be an anonymous function below but the JSCompiler seems to have a bug where
 * it thinks goog.events.Listener is not referenced if it's only referenced from
 * the anonymous function.
 * @return {goog.events.Listener} A new listener.
 * @private
 */
goog.events.createListenerFunction_ = function() {
  return new goog.events.Listener();
};


/**
 * SimplePool to cache the listener objects. This was implemented to make IE6
 * performance better and removed an object allocation in goog.events.listen
 * when in steady state.
 * @type {goog.structs.SimplePool}
 * @private
 */
goog.events.listenerPool_ = new goog.structs.SimplePool(
    goog.events.LISTENER_POOL_INITIAL_COUNT,
    goog.events.LISTENER_POOL_MAX_COUNT);
goog.events.listenerPool_.setCreateObjectFn(
    goog.events.createListenerFunction_);


/**
 * Initial count for the eventPool_
 * @type {number}
 */
goog.events.EVENT_POOL_INITIAL_COUNT = 0;


/**
 * Max count for the eventPool_
 * @type {number}
 */
goog.events.EVENT_POOL_MAX_COUNT = 600;


/**
 * Function for creating an event object for goog.events.eventPool_.
 * @return {goog.events.BrowserEvent} Event object.
 * @private
 */
goog.events.createEventFunction_ = function() {
  return new goog.events.BrowserEvent();
};


/**
 * Created the BrowserEvent object pool.
 * @return {goog.structs.SimplePool?} The event pool for IE browsers,
 *     null for other browsers.
 * @private
 */
goog.events.createEventPool_ = function() {
  var eventPool = null;
  if (goog.userAgent.IE) {
    eventPool = new goog.structs.SimplePool(
      goog.events.EVENT_POOL_INITIAL_COUNT,
      goog.events.EVENT_POOL_MAX_COUNT);
    eventPool.setCreateObjectFn(goog.events.createEventFunction_);
  }
  return eventPool;
};


/**
 * SimplePool to cache the event objects. This was implemented to make IE6
 * performance better and removed an object allocation in
 * goog.events.handleBrowserEvent_ when in steady state.
 * This pool is only used for IE events.
 * @type {goog.structs.SimplePool?}
 * @private
 */
goog.events.eventPool_ = goog.events.createEventPool_();


/**
 * String used to prepend to IE event types.  Not a constant so that it is not
 * inlined.
 * @type {string}
 * @private
 */
goog.events.onString_ = 'on';


/**
 * Map of computed on strings for IE event types. Caching this removes an extra
 * object allocation in goog.events.listen which improves IE6 performance.
 * @type {Object}
 * @private
 */
goog.events.onStringMap_ = {};

/**
 * Separator used to split up the various parts of an event key, to help avoid
 * the possibilities of collisions.
 * @type {string}
 * @private
 */
goog.events.keySeparator_ = '_';


/**
 * Adds an event listener for a specific event on a DOM Node or an object that
 * has implemented {@link goog.events.EventTarget}. A listener can only be
 * added once to an object and if it is added again the key for the listener
 * is returned.
 *
 * @param {EventTarget|goog.events.EventTarget} src The node to listen to
 *     events on.
 * @param {string|Array.<string>} type Event type or array of event types.
 * @param {Function|Object} listener Callback method, or an object with a
 *     handleEvent function.
 * @param {boolean} opt_capt Fire in capture phase?.
 * @param {Object} opt_handler Element in who's scope to call the listener.
 * @return {number?} Unique key for the listener.
 */
goog.events.listen = function(src, type, listener, opt_capt, opt_handler) {
  if (!type) {
    throw Error('Invalid event type');
  } else if (goog.isArray(type)) {
    for (var i = 0; i < type.length; i++) {
      goog.events.listen(src, type[i], listener, opt_capt, opt_handler);
    }
    return null;
  } else {
    var capture = !!opt_capt;
    var map = goog.events.listenerTree_;

    if (!(type in map)) {
      map[type] = goog.events.objectPool_.getObject();
    }
    map = map[type];

    if (!(capture in map)) {
      map[capture] = goog.events.objectPool_.getObject();
      map.count_++;
    }
    map = map[capture];

    var srcHashCode = goog.getHashCode(src);
    var listenerArray, listenerObj;

    // The remaining_ property is used to be able to short circuit the iteration
    // of the event listeners.
    //
    // Increment the remaining event listeners to call even if this event might
    // already have been fired. At this point we do not know if the event has
    // been fired and it is too expensive to find out. By incrementing it we are
    // guaranteed that we will not skip any event listeners.
    map.remaining_++;

    // Do not use srcHashCode in map here since that will cast the number to a
    // string which will allocate one string object.
    if (!map[srcHashCode]) {
      listenerArray = map[srcHashCode] = goog.events.arrayPool_.getObject();
      map.count_++;
    } else {
      listenerArray = map[srcHashCode];
      // Ensure that the listeners do not already contain the current listener
      for (var i = 0; i < listenerArray.length; i++) {
        listenerObj = listenerArray[i];
        if (listenerObj.listener == listener &&
            listenerObj.handler == opt_handler) {

          // If this listener has been removed we should not return its key. It
          // is OK that we create new listenerObj below since the removed one
          // will be cleaned up later.
          if (listenerObj.removed) {
            break;
          }

          // We already have this listener. Return its key.
          return listenerArray[i].key;
        }
      }
    }

    var proxy = goog.events.handleEventProxyPool_.getObject();
    proxy.src = src;

    listenerObj = goog.events.listenerPool_.getObject();
    listenerObj.init(listener, proxy, src, type, capture, opt_handler);
    var key = listenerObj.key;
    proxy.key = key;

    listenerArray.push(listenerObj);
    goog.events.listeners_[key] = listenerObj;

    if (!goog.events.sources_[srcHashCode]) {
      goog.events.sources_[srcHashCode] = goog.events.arrayPool_.getObject();
    }
    goog.events.sources_[srcHashCode].push(listenerObj);


    // Attach the proxy through the browser's API
    if (src.addEventListener) {
      if (src == goog.global || !src.customEvent_) {
        src.addEventListener(type, proxy, capture);
      }
    } else {
      // The else above used to be else if (src.attachEvent) and then there was
      // another else statement that threw an exception warning the developer
      // they made a mistake. This resulted in an extra object allocation in IE6
      // due to a wrapper object that had to be implemented around the element
      // and so was removed.
      src.attachEvent(goog.events.getOnString_(type), proxy);
    }

    return key;
  }
};


/**
 * Adds an event listener for a specific event on a DomNode or an object that
 * has implemented {@link goog.events.EventTarget}. After the event has fired
 * the event listener is removed from the target.
 *
 * @param {EventTarget|goog.events.EventTarget} src The node to listen to
 *     events on.
 * @param {string|Array.<string>} type Event type or array of event types.
 * @param {Function} listener Callback method.
 * @param {boolean} opt_capt Fire in capture phase?.
 * @param {Object} opt_handler Element in who's scope to call the listener.
 * @return {number?} Unique key for the listener.
 */
goog.events.listenOnce = function(src, type, listener, opt_capt, opt_handler) {
  if (goog.isArray(type)) {
    for (var i = 0; i < type.length; i++) {
      goog.events.listenOnce(src, type[i], listener, opt_capt, opt_handler);
    }
    return null;
  }

  var key = goog.events.listen(src, type, listener, opt_capt, opt_handler);
  var listenerObj = goog.events.listeners_[key];
  listenerObj.callOnce = true;
  return key;
};


/**
 * Removes an event listener which was added with listen().
 *
 * @param {EventTarget|goog.events.EventTarget} src The target to stop
 *     listening to events on.
 * @param {string|Array.<string>} type The name of the event without the 'on'
 *     prefix.
 * @param {Function} listener The listener function to remove.
 * @param {boolean} opt_capt In DOM-compliant browsers, this determines
 *     whether the listener is fired during the capture or bubble phase of the
 *     event.
 * @param {Object} opt_handler Element in who's scope to call the listener.
 * @return {boolean?} indicating whether the listener was there to remove.
 */
goog.events.unlisten = function(src, type, listener, opt_capt, opt_handler) {
  if (goog.isArray(type)) {
    for (var i = 0; i < type.length; i++) {
      goog.events.unlisten(src, type[i], listener, opt_capt, opt_handler);
    }
    return null;
  }

  var capture = !!opt_capt;

  var listenerArray = goog.events.getListeners_(src, type, capture);
  if (!listenerArray) {
    return false;
  }

  for (var i = 0; i < listenerArray.length; i++) {
    if (listenerArray[i].listener == listener &&
        listenerArray[i].capture == capture &&
        listenerArray[i].handler == opt_handler) {
      return goog.events.unlistenByKey(listenerArray[i].key);
    }
  }

  return false;
};


/**
 * Removes an event listener which was added with listen() by the key
 * returned by listen().
 *
 * @param {number} key The key returned by listen() for this event listener.
 * @return {boolean} indicating whether the listener was there to remove.
 */
goog.events.unlistenByKey = function(key) {
  // Do not use key in listeners here since that will cast the number to a
  // string which will allocate one string object.
  if (!goog.events.listeners_[key]) {
    return false;
  }
  var listener = goog.events.listeners_[key];

  if (listener.removed) {
    return false;
  }

  var src = listener.src;
  var type = listener.type;
  var proxy = listener.proxy;
  var capture = listener.capture;

  if (src.removeEventListener) {
    // EventTarget calls unlisten so we need to ensure that the source is not
    // an event target to prevent re-entry.
    // TODO(arv): What is this goog.global for? Why would anyone listen to
    // events on the [[Global]] object? Is it supposed to be window? Why would
    // we not want to allow removing event listeners on the window?
    if (src == goog.global || !src.customEvent_) {
      src.removeEventListener(type, proxy, capture);
    }
  } else if (src.detachEvent) {
    src.detachEvent(goog.events.getOnString_(type), proxy);
  }

  var srcHashCode = goog.getHashCode(src);
  var listenerArray = goog.events.listenerTree_[type][capture][srcHashCode];

  // In a perfect implementation we would decrement the remaining_ field here
  // but then we would need to know if the listener has already been fired or
  // not. We therefore skip doing this and in this uncommon case the entire
  // ancestor chain will need to be traversed as before.

  // Remove from sources_
  if (goog.events.sources_[srcHashCode]) {
    var sourcesArray = goog.events.sources_[srcHashCode];
    goog.array.remove(sourcesArray, listener);
    if (sourcesArray.length == 0) {
      delete goog.events.sources_[srcHashCode];
    }
  }

  listener.removed = true;
  listenerArray.needsCleanup_ = true;
  goog.events.cleanUp_(type, capture, srcHashCode, listenerArray);

  delete goog.events.listeners_[key];

  return true;
};


/**
 * Cleans up the listener array as well as the listener tree
 * @param {string} type  The type of the event.
 * @param {boolean} capture Whether to clean up capture phase listeners instead
 *     bubble phase listeners.
 * @param {number} srcHashCode  The hash code of the source.
 * @param {Array.<goog.events.Listener>} listenerArray The array being cleaned.
 * @private
 */
goog.events.cleanUp_ = function(type, capture, srcHashCode, listenerArray) {
  // The listener array gets locked during the dispatch phase so that removals
  // of listeners during this phase does not screw up the indeces. This method
  // is called after we have removed a listener as well as after the dispatch
  // phase in case any listeners were removed.
  if (!listenerArray.locked_) { // catches both 0 and not set
    if (listenerArray.needsCleanup_) {
      // Loop over the listener array and remove listeners that have removed set
      // to true. This could have been done with filter or something similar but
      // we want to change the array in place and we want to minimize
      // allocations. Adding a listener during this phase adds to the end of the
      // array so that works fine as long as the length is rechecked every in
      // iteration.
      for (var oldIndex = 0, newIndex = 0;
           oldIndex < listenerArray.length;
           oldIndex++) {
        if (listenerArray[oldIndex].removed) {
          goog.events.listenerPool_.releaseObject(listenerArray[oldIndex]);
          continue;
        }
        if (oldIndex != newIndex) {
          listenerArray[newIndex] = listenerArray[oldIndex];
        }
        newIndex++;
      }
      listenerArray.length = newIndex;

      listenerArray.needsCleanup_ = false;

      // In case the length is now zero we release the object.
      if (newIndex == 0) {
        goog.events.arrayPool_.releaseObject(listenerArray);
        delete goog.events.listenerTree_[type][capture][srcHashCode];
        goog.events.listenerTree_[type][capture].count_--;

        if (goog.events.listenerTree_[type][capture].count_ == 0) {
          goog.events.objectPool_.releaseObject(
              goog.events.listenerTree_[type][capture]);
          delete goog.events.listenerTree_[type][capture];
          goog.events.listenerTree_[type].count_--;
        }

        if (goog.events.listenerTree_[type].count_ == 0) {
          goog.events.objectPool_.releaseObject(
              goog.events.listenerTree_[type]);
          delete goog.events.listenerTree_[type];
        }
      }

    }
  }
};


/**
 * Removes all listeners from an object, if no object is specified it will
 * remove all listeners that have been registered.  You can also optionally
 * remove listeners of a particular type or capture phase.
 *
 * @param {Object} opt_obj Object to remove listeners from.
 * @param {string} opt_type Type of event to, default is all types.
 * @param {boolean} opt_capt Whether to remove the listeners from the capture or
 * bubble phase.  If unspecified, will remove both.
 * @return {number} Number of listeners removed.
 */
goog.events.removeAll = function(opt_obj, opt_type, opt_capt) {
  var count = 0;

  var noObj = opt_obj == null;
  var noType = opt_type == null;
  var noCapt = opt_capt == null;
  opt_capt = !!opt_capt;

  if (!noObj) {
    var srcHashCode = goog.getHashCode(/** @type {Object} */ (opt_obj));
    if (goog.events.sources_[srcHashCode]) {
      var sourcesArray = goog.events.sources_[srcHashCode];
      for (var i = sourcesArray.length - 1; i >= 0; i--) {
        var listener = sourcesArray[i];
        if ((noType || opt_type == listener.type) &&
            (noCapt || opt_capt == listener.capture)) {
          goog.events.unlistenByKey(listener.key);
          count++;
        }
      }
    }
  } else {
    // Loop over the sources_ map instead of over the listeners_ since it is
    // smaller which results in fewer allocations.
    goog.object.forEach(goog.events.sources_, function(listeners) {
      for (var i = listeners.length - 1; i >= 0; i--) {
        var listener = listeners[i];
        if ((noType || opt_type == listener.type) &&
            (noCapt || opt_capt == listener.capture)) {
          goog.events.unlistenByKey(listener.key);
          count++;
        }
      }
    });
  }

  return count;
};


/**
 * Gets the listeners for a given object, type and capture phase.
 *
 * @param {Object} obj Object to get listeners for.
 * @param {string} type Event type.
 * @param {boolean} capture Capture phase?.
 * @return {Array.<goog.events.Listener>} Array of listener objects.
 */
goog.events.getListeners = function(obj, type, capture) {
  return goog.events.getListeners_(obj, type, capture) || [];
};


/**
 * Gets the listeners for a given object, type and capture phase.
 *
 * @param {Object} obj Object to get listeners for.
 * @param {string} type Event type.
 * @param {boolean} capture Capture phase?.
 * @return {Array.<goog.events.Listener>?} Array of listener objects.
 *     Returns null if object has no lsiteners of that type.
 * @private
 */
goog.events.getListeners_ = function(obj, type, capture) {
  var map = goog.events.listenerTree_;
  if (type in map) {
    map = map[type];
    if (capture in map) {
      map = map[capture];
      var objHashCode = goog.getHashCode(obj);
      if (map[objHashCode]) {
        return map[objHashCode];
      }
    }
  }

  return null;
};


/**
 * Gets the goog.events.Listener for the event or null if no such listener is
 * in use.
 *
 * @param {EventTarget|goog.events.EventTarget} src The node to stop
 *     listening to events on.
 * @param {string} type The name of the event without the 'on' prefix.
 * @param {Function} listener The listener function to remove.
 * @param {boolean} opt_capt In DOM-compliant browsers, this determines
 *                            whether the listener is fired during the
 *                            capture or bubble phase of the event.
 * @param {Object} opt_handler Element in who's scope to call the listener.
 * @return {goog.events.Listener?} the found listener or null if not found.
 */
goog.events.getListener = function(src, type, listener, opt_capt, opt_handler) {
  var capture = !!opt_capt;
  var listenerArray = goog.events.getListeners_(src, type, capture);
  if (listenerArray) {
    for (var i = 0; i < listenerArray.length; i++) {
      if (listenerArray[i].listener == listener &&
          listenerArray[i].capture == capture &&
          listenerArray[i].handler == opt_handler) {
        // We already have this listener. Return its key.
        return listenerArray[i];
      }
    }
  }
  return null;
};


/**
 * Returns whether an event target has any active listeners matching the
 * specified signature. If either the type or capture parameters are
 * unspecified, the function will match on the remaining criteria.
 *
 * @param {EventTarget|goog.events.EventTarget} obj Target to get listeners for.
 * @param {string} opt_type Event type.
 * @param {boolean} opt_capture Whether to check for capture or bubble-phase
 *     listeners.
 * @return {boolean} Whether an event target has one or more listeners matching
 *     the requested type and/or capture phase.
 */
goog.events.hasListener = function(obj, opt_type, opt_capture) {
  var objHashCode = goog.getHashCode(obj)
  var listeners = goog.events.sources_[objHashCode];

  if (listeners) {
    var hasType = goog.isDef(opt_type);
    var hasCapture = goog.isDef(opt_capture);

    if (hasType && hasCapture) {
      // Lookup in the listener tree whether the specified listener exists.
      var map = goog.events.listenerTree_[opt_type]
      return !!map && !!map[opt_capture] && objHashCode in map[opt_capture];

    } else if (!(hasType || hasCapture)) {
      // Simple check for whether the event target has any listeners at all.
      return true;

    } else {
      // Iterate through the listeners for the event target to find a match.
      return goog.array.some(listeners, function(listener) {
          return (hasType && listener.type == opt_type) ||
            (hasCapture && listener.capture == opt_capture);
      });
    }
  }

  return false;
};


/**
 * Provides a nice string showing the normalized event objects public members
 * @param {Object} e Event Object.
 * @return {string} String of the public members of the normalized event object.
 */
goog.events.expose = function(e) {
  var str = [];
  for (var key in e) {
    if (e[key] && e[key].id) {
      str.push(key + ' = ' + e[key] + ' (' + e[key].id + ')');
    } else {
      str.push(key + ' = ' + e[key]);
    }
  }
  return str.join('\n');
};


/**
 * Constants for event names.
 * @enum {string}
 */
goog.events.EventType = {
  // Mouse events
  CLICK: 'click',
  DBLCLICK: 'dblclick',
  MOUSEDOWN: 'mousedown',
  MOUSEUP: 'mouseup',
  MOUSEOVER: 'mouseover',
  MOUSEOUT: 'mouseout',
  MOUSEMOVE: 'mousemove',
  SELECTSTART: 'selectstart', // IE, Safari, Chrome

  // Key events
  KEYPRESS: 'keypress',
  KEYDOWN: 'keydown',
  KEYUP: 'keyup',

  // Focus
  BLUR: 'blur',
  FOCUS: 'focus',
  DEACTIVATE: 'deactivate', // IE only
  // TODO(pupius): Test these. I experienced problems with DOMFocusIn, the event
  // just wasn't firing.
  FOCUSIN: goog.userAgent.IE ? 'focusin' : 'DOMFocusIn',
  FOCUSOUT: goog.userAgent.IE ? 'focusout' : 'DOMFocusOut',

  // Forms
  CHANGE: 'change',
  SELECT: 'select',
  SUBMIT: 'submit',

  // Misc
  LOAD: 'load',
  UNLOAD: 'unload',
  ERROR: 'error',
  HELP: 'help',
  RESIZE: 'resize',
  SCROLL: 'scroll',
  READYSTATECHANGE: 'readystatechange',
  CONTEXTMENU: 'contextmenu'
};


/**
 * Returns a string wth on prepended to the specified type. This is used for IE
 * which expects "on" to be prepended. This function caches the string in order
 * to avoid extra allocations in steady state.
 * @param {string} type Event type strng.
 * @return {string} The type string with 'on' prepended.
 * @private
 */
goog.events.getOnString_ = function(type) {
  if (type in goog.events.onStringMap_) {
    return goog.events.onStringMap_[type];
  }
  return goog.events.onStringMap_[type] = goog.events.onString_ + type;
};


/**
 * Fires an object's listeners of a particular type and phase
 *
 * @param {Object} obj Object who's listeners to call.
 * @param {string} type Event type.
 * @param {boolean} capture Which event phase.
 * @param {Object} eventObject Event object to be passed to listener.
 * @return {boolean} True if all listeners returned true else false.
 */
goog.events.fireListeners = function(obj, type, capture, eventObject) {
  var map = goog.events.listenerTree_;
  if (type in map) {
    map = map[type];
    if (capture in map) {
      return goog.events.fireListeners_(map[capture], obj, type,
                                        capture, eventObject);
    }
  }
  return true;
};


/**
 * Fires an object's listeners of a particular type and phase.
 *
 * @param {Object} map Object with listeners in it.
 * @param {Object} obj Object who's listeners to call.
 * @param {string} type Event type.
 * @param {boolean} capture Which event phase.
 * @param {Object} eventObject Event object to be passed to listener.
 * @return {boolean} True if all listeners returned true else false.
 * @private
 */
goog.events.fireListeners_ = function(map, obj, type, capture, eventObject) {
  var retval = 1;

  var objHashCode = goog.getHashCode(obj);
  if (map[objHashCode]) {
    map.remaining_--;
    var listenerArray = map[objHashCode];

    // If locked_ is not set (and if already 0) initialize it to 1.
    if (!listenerArray.locked_) {
      listenerArray.locked_ = 1;
    } else {
      listenerArray.locked_++;
    }

    try {
      // Events added in the dispatch phase should not be dispatched in
      // the current dispatch phase. They will be included in the next
      // dispatch phase though.
      var length = listenerArray.length;
      for (var i = 0; i < length; i++) {
        var listener = listenerArray[i];
        // We might not have a listener if the listener was removed.
        if (listener && !listener.removed) {
          retval &=
              goog.events.fireListener(listener, eventObject) !== false;
        }
      }
    } finally {
      listenerArray.locked_--;
      goog.events.cleanUp_(type, capture, objHashCode, listenerArray);
    }
  }

  return Boolean(retval);
};


/**
 * Fires a listener with a set of arguments
 *
 * @param {goog.events.Listener} listener The listener object to call.
 * @param {Object} eventObject The event object to pass to the listener.
 * @return {boolean} Result of listener.
 */
goog.events.fireListener = function(listener, eventObject) {
  var rv = listener.handleEvent(eventObject);
  if (listener.callOnce) {
    goog.events.unlistenByKey(listener.key);
  }
  return rv;
};


/**
 * Gets the total number of listeners currently in the system.
 * @return {number} Number of listeners.
 */
goog.events.getTotalListenerCount = function() {
  return goog.object.getCount(goog.events.listeners_);
};


/**
 * Dispatches an event (or event like object) and calls all listeners
 * listening for events of this type. The type of the event is decided by the
 * type property on the event object.
 *
 * If any of the listeners returns false OR calls preventDefault then this
 * function will return false.  If one of the capture listeners calls
 * stopPropagation, then the bubble listeners won't fire.
 *
 * @param {goog.events.EventTarget} src  The event target.
 * @param {string|Object|goog.events.Event} e Event object.
 * @return {boolean} If anyone called preventDefault on the event object (or
 *     if any of the handlers returns false) this will also return false.
 *     If there are no handlers, or if all handlers return true, this returns
 *     true.
 */
goog.events.dispatchEvent = function(src, e) {
  // If accepting a string or object, create a custom event object so that
  // preventDefault and stopPropagation work with the event.
  if (goog.isString(e)) {
    e = new goog.events.Event(e, src);
  } else if (!(e instanceof goog.events.Event)) {
    var oldEvent = e;
    e = new goog.events.Event(e.type, src);
    goog.object.extend(e, oldEvent);
  } else {
    e.target = e.target || src;
  }

  var rv = 1, ancestors;

  var type = e.type;
  var map = goog.events.listenerTree_;

  if (!(type in map)) {
    return true;
  }

  map = map[type];
  var hasCapture = true in map;
  var hasBubble = false in map;
  var targetsMap;

  if (hasCapture) {
    // Build ancestors now
    ancestors = [];
    for (var parent = src; parent; parent = parent.getParentEventTarget()) {
      ancestors.push(parent);
    }

    targetsMap = map[true];
    targetsMap.remaining_ = targetsMap.count_;

    // Call capture listeners
    for (var i = ancestors.length - 1;
         !e.propagationStopped_ && i >= 0 && targetsMap.remaining_;
         i--) {
      e.currentTarget = ancestors[i];
      rv &= goog.events.fireListeners_(targetsMap, ancestors[i], e.type,
                                       true, e) &&
            e.returnValue_ != false;
    }
  }

  if (hasBubble) {
    targetsMap = map[false];
    targetsMap.remaining_ = targetsMap.count_;

    if (hasCapture) { // We have the ancestors.

      // Call bubble listeners
      for (var i = 0; !e.propagationStopped_ && i < ancestors.length &&
           targetsMap.remaining_;
           i++) {
        e.currentTarget = ancestors[i];
        rv &= goog.events.fireListeners_(targetsMap, ancestors[i], e.type,
                                         false, e) &&
              e.returnValue_ != false;
      }
    } else {
      // In case we don't have capture we don't have to build up the
      // ancestors array.

      for (var current = src;
           !e.propagationStopped_ && current && targetsMap.remaining_;
           current = current.getParentEventTarget()) {
        e.currentTarget = current;
        rv &= goog.events.fireListeners_(targetsMap, current, e.type,
                                         false, e) &&
              e.returnValue_ != false;
      }
    }
  }

  return Boolean(rv);
};


/**
 * Installs exception protection for the browser event entry point using the
 * given error handler.
 *
 * @param {goog.debug.ErrorHandler} errorHandler Error handler with which to
 *     protect the entry point.
 * @param {boolean} opt_tracers Whether to install tracers around the browser
 *     event entry point.
 */
goog.events.protectBrowserEventEntryPoint = function(
    errorHandler, opt_tracers) {
  goog.events.handleBrowserEvent_ = errorHandler.protectEntryPoint(
      goog.events.handleBrowserEvent_, opt_tracers);
};


/**
 * Handles an event and dispatches it to the correct listeners. This
 * function is a proxy for the real listener the user specified.
 *
 * @param {string} key Unique key for the listener.
 * @param {Object} opt_evt Optional event object that gets passed in via the
 *     native event handlers.
 * @return {boolean} Result of the event handler.
 * @this {goog.events.EventTarget|Object|Element} The object or Element that
 *     fired the event.
 * @private
 */
goog.events.handleBrowserEvent_ = function(key, opt_evt) {
  // If the listener isn't there it was probably removed when processing
  // another listener on the same event (e.g. the later listener is
  // not managed by closure so that they are both fired under IE)
  if (!goog.events.listeners_[key]) {
    return true;
  }

  var listener = goog.events.listeners_[key];
  var type = listener.type;
  var map = goog.events.listenerTree_;

  if (!(type in map)) {
    return true;
  }
  map = map[type];
  var retval, targetsMap;
  if (goog.userAgent.IE) {
    var ieEvent = opt_evt || goog.getObjectByName('window.event');

    // Check if we have any capturing event listeners for this type.
    var hasCapture = true in map;
    var hasBubble = false in map;

    if (hasCapture) {
      if (goog.events.isMarkedIeEvent_(ieEvent)) {
        return true;
      }

      goog.events.markIeEvent_(ieEvent);
    }

    var evt = goog.events.eventPool_.getObject();
    evt.init(ieEvent, this);

    retval = true;
    try {
      if (hasCapture) {
        // Use a pool so we don't allocate a new array
        var ancestors = goog.events.arrayPool_.getObject();

        for (var parent = evt.currentTarget;
             parent;
             parent = parent.parentNode) {
          ancestors.push(parent);
        }

        targetsMap = map[true];
        targetsMap.remaining_ = targetsMap.count_;

        // Call capture listeners
        for (var i = ancestors.length - 1;
             !evt.propagationStopped_ && i >= 0 && targetsMap.remaining_;
             i--) {
          evt.currentTarget = ancestors[i];
          retval &= goog.events.fireListeners_(targetsMap, ancestors[i], type,
                                               true, evt);
        }

        if (hasBubble) {
          targetsMap = map[false];
          targetsMap.remaining_ = targetsMap.count_;

          // Call bubble listeners
          for (var i = 0;
               !evt.propagationStopped_ && i < ancestors.length &&
               targetsMap.remaining_;
               i++) {
            evt.currentTarget = ancestors[i];
            retval &= goog.events.fireListeners_(targetsMap, ancestors[i], type,
                                                 false, evt);
          }
        }

      } else {
        // Bubbling, let IE handle the propagation.
        retval = goog.events.fireListener(listener, evt);
      }

    } finally {
      if (ancestors) {
        ancestors.length = 0;
        goog.events.arrayPool_.releaseObject(ancestors);
      }
      evt.dispose();
      goog.events.eventPool_.releaseObject(evt);
    }
    return retval;
  } // IE

  // Caught a non-IE DOM event. 1 additional argument which is the event object
  var be = new goog.events.BrowserEvent(/** @type {Event} */ (opt_evt), this);
  try {
    retval = goog.events.fireListener(listener, be);
  } finally {
    be.dispose();
  }
  return retval;
};


/**
 * This is used to mark the IE event object so we do not do the Closure pass
 * twice for a bubbling event.
 * @param {Object} e  The IE browser event.
 * @private
 */
goog.events.markIeEvent_ = function(e) {
  // Only the keyCode and the returnValue can be changed. We use keyCode for
  // non keyboard events.
  // event.returnValue is a bit more tricky. It is undefined by default. A
  // boolean false prevents the default action. In a window.onbeforeunload and
  // the returnValue is non undefined it will be alerted. However, we will only
  // modify the returnValue for keyboard events. We can get a problem if non
  // closure events sets the keyCode or the returnValue

  var useReturnValue = false;

  if (e.keyCode == 0) {
    // We cannot change the keyCode in case that srcElement is input[type=file].
    // We could test that that is the case but that would allocate 3 objects.
    // If we use try/catch we will only allocate extra objects in the case of a
    // failure.
    /** @preserveTry */
    try {
      e.keyCode = -1;
      return;
    } catch (ex) {
      useReturnValue = true;
    }
  }

  if (useReturnValue ||
      /** @type {boolean|undefined} */ e.returnValue == undefined) {
    e.returnValue = true;
  }
};


/**
 * This is used to check if an IE event has already been handled by the Closure
 * system so we do not do the Closure pass twice for a bubbling event.
 * @param {Event} e  The IE browser event.
 * @return {boolean} True if the event object has been marked.
 * @private
 * @notypecheck TODO(nicksantos): Fix this.
 */
goog.events.isMarkedIeEvent_ = function(e) {
  return e.keyCode < 0 || e.returnValue != undefined;
};

// Copyright 2005 Google Inc.
// All Rights Reserved
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 
//  * Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
//  * Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in
//    the documentation and/or other materials provided with the
//    distribution.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
// INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
// BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
// LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
// ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE. 

/**
 * @fileoverview Class to create objects which want to handle multiple events
 * and have their listeners easily cleaned up via a dispose method.
 *
 * Example:
 * <pre>
 * function Something() {
 *   goog.events.EventHandler.call(this);
 *
 *   ... set up object ...
 *
 *   // Add event listeners
 *   this.listen(this.starEl, 'click', this.handleStar);
 *   this.listen(this.headerEl, 'click', this.expand);
 *   this.listen(this.collapseEl, 'click', this.collapse);
 *   this.listen(this.infoEl, 'mouseover', this.showHover);
 *   this.listen(this.infoEl, 'mouseout', this.hideHover);
 * }
 * goog.inherits(Something, goog.events.EventHandler);
 *
 * Something.prototype.disposeInternal = function() {
 *   Something.superClass_.disposeInternal.call(this);
 *   goog.dom.removeNode(this.container);
 * };
 *
 *
 * // Then elsewhere:
 *
 * var activeSomething = null;
 * function openSomething() {
 *   activeSomething = new Something();
 * }
 *
 * function closeSomething() {
 *   if (activeSomething) {
 *     activeSomething.dispose();  // Remove event listeners
 *     activeSomething = null;
 *   }
 * }
 * </pre>
 *
 */

goog.provide('goog.events.EventHandler');

goog.require('goog.Disposable');
goog.require('goog.events');
goog.require('goog.object');
goog.require('goog.structs.SimplePool');


/**
 * Super class for objects that want to easily manage a number of event
 * listeners.  It allows a short cut to listen and also provides a quick way
 * to remove all events listeners belonging to this object. It is optimized to
 * use less objects if only one event is being listened to, but if that's the
 * case, it may not be worth using the EventHandler anyway.
 * @param {Object} opt_handler Object in who's scope to call the listeners.
 * @constructor
 * @extends {goog.Disposable}
 */
goog.events.EventHandler = function(opt_handler) {
  this.handler_ = opt_handler;
};
goog.inherits(goog.events.EventHandler, goog.Disposable);


/**
 * Initial count for the keyPool_
 * @type {number}
 */
goog.events.EventHandler.KEY_POOL_INITIAL_COUNT = 0;


/**
 * Max count for the keyPool_
 * @type {number}
 */
goog.events.EventHandler.KEY_POOL_MAX_COUNT = 100;


/**
 * SimplePool to cache the key object. This was implemented to make IE6
 * performance better and removed an object allocation in the listen method
 * when in steady state.
 * @type {goog.structs.SimplePool}
 * @private
 */
goog.events.EventHandler.keyPool_ = new goog.structs.SimplePool(
    goog.events.EventHandler.KEY_POOL_INITIAL_COUNT,
    goog.events.EventHandler.KEY_POOL_MAX_COUNT);


/**
 * Keys for events that are being listened to. This is used once there are more
 * than one event to listen to. If there is only one event to listen to, key_
 * is used.
 * @type {Object?}
 * @private
 */
goog.events.EventHandler.keys_ = null;


/**
 * Keys for event that is being listened to if only one event is being listened
 * to. This is a performance optimization to avoid creating an extra object
 * if not necessary.
 * @type {string?}
 * @private
 */
goog.events.EventHandler.key_ = null;


/**
 * Listen to an event on a DOM node or EventTarget.  If the function is ommitted
 * then the EventHandler's handleEvent method will be used.
 * @param {goog.events.EventTarget|EventTarget} src Event source.
 * @param {string|Array.<string>} type Event type to listen for or array of
 *     event types.
 * @param {Function|Object} opt_fn Optional callback function to be used as the
 *    listener or an object with handleEvent function.
 * @param {boolean} opt_capture Optional whether to use capture phase.
 * @param {Object} opt_handler Object in who's scope to call the listener.
 * @return {goog.events.EventHandler} This object, allowing for chaining of
 *     calls.
 */
goog.events.EventHandler.prototype.listen = function(src, type, opt_fn,
                                                     opt_capture,
                                                     opt_handler) {
  if (goog.isArray(type)) {
    for (var i = 0; i < type.length; i++) {
      this.listen(src, type[i], opt_fn, opt_capture, opt_handler);
    }
  } else {
    var key = goog.events.listen(src, type, opt_fn || this,
                                 opt_capture || false,
                                 opt_handler || this.handler_ || this);
    this.recordListenerKey_(key);
  }

  return this;
};


/**
 * Listen to an event on a DOM node or EventTarget.  If the function is ommitted
 * then the EventHandler's handleEvent method will be used. After the event has
 * fired the event listener is removed from the target. If an array of event
 * types is provided, each event type will be listened to once.
 * @param {goog.events.EventTarget|EventTarget} src Event source.
 * @param {string|Array.<string>} type Event type to listen for or array of
 *     event types.
 * @param {Function|Object} opt_fn Optional callback function to be used as the
 *    listener or an object with handleEvent function.
 * @param {boolean} opt_capture Optional whether to use capture phase.
 * @param {Object} opt_handler Object in who's scope to call the listener.
 * @return {goog.events.EventHandler} This object, allowing for chaining of
 *     calls.
 */
goog.events.EventHandler.prototype.listenOnce = function(src, type, opt_fn,
                                                         opt_capture,
                                                         opt_handler) {
  if (goog.isArray(type)) {
    for (var i = 0; i < type.length; i++) {
      this.listenOnce(src, type[i], opt_fn, opt_capture, opt_handler);
    }
  } else {
    var key = goog.events.listenOnce(src, type, opt_fn || this,
                                     opt_capture || false,
                                     opt_handler || this.handler_ || this);
    this.recordListenerKey_(key);
  }

  return this;
};


/**
 * Record the key returned for the listener so that it can be user later
 * to remove the listener.
 * @param {number} key Unique key for the listener.
 * @private
 */
goog.events.EventHandler.prototype.recordListenerKey_ = function(key) {
  if (this.keys_) {
    // already have multiple keys
    this.keys_[key] = true;
  } else if (this.key_) {
    // going from one key to multiple - must now use object as map
    this.keys_ = goog.events.EventHandler.keyPool_.getObject();
    this.keys_[this.key_] = true;
    this.key_ = null;
    this.keys_[key] = true;
  } else {
    // first key - can use single key
    this.key_ = key;
  }
};


/**
 * Unlistens on an event.
 * @param {goog.events.EventTarget|EventTarget} src Event source.
 * @param {string|Array.<string>} type Event type to listen for.
 * @param {Function|Object} opt_fn Optional callback function to be used as the
 *    listener or an object with handleEvent function.
 * @param {boolean} opt_capture Optional whether to use capture phase.
 * @param {Object} opt_handler Object in who's scope to call the listener.
 * @return {goog.events.EventHandler} This object, allowing for chaining of
 *     calls.
 */
goog.events.EventHandler.prototype.unlisten = function(src, type, opt_fn,
                                                       opt_capture,
                                                       opt_handler) {
  if (this.key_ || this.keys_) {
    if (goog.isArray(type)) {
      for (var i = 0; i < type.length; i++) {
        this.unlisten(src, type[i], opt_fn, opt_capture, opt_handler);
      }
    } else {
      var listener = goog.events.getListener(src, type, opt_fn || this,
          opt_capture || false, opt_handler || this.handler_ || this);

      if (listener) {
        var key = listener.key;
        goog.events.unlistenByKey(key);

        if (this.keys_) {
          goog.object.remove(this.keys_, key);
        } else if (this.key_ == key) {
          this.key_ = null;
        }
      }
    }
  }

  return this;
};


/**
 * Unlistens to all events.
 */
goog.events.EventHandler.prototype.removeAll = function() {
  if (this.keys_) {
    for (var key in this.keys_) {
      goog.events.unlistenByKey(key);
      // Clean the keys before returning object to the pool.
      delete this.keys_[key];
    }
    goog.events.EventHandler.keyPool_.releaseObject(this.keys_);
    this.keys_ = null;

  } else if (this.key_) {
    goog.events.unlistenByKey(this.key_);
  }
};


/**
 * Disposes of this EventHandler and remove all listeners that it registered.
 */
goog.events.EventHandler.prototype.disposeInternal = function() {
  goog.events.EventHandler.superClass_.disposeInternal.call(this);
  this.removeAll();
};


/**
 * Default event handler
 * @param {goog.events.Event} e Event object.
 */
goog.events.EventHandler.prototype.handleEvent = function(e) {
  throw Error('EventHandler.handleEvent not implemented');
};

// Copyright 2005 Google Inc.
// All Rights Reserved
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 
//  * Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
//  * Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in
//    the documentation and/or other materials provided with the
//    distribution.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
// INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
// BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
// LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
// ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE. 

/**
 * @fileoverview Implementation of EventTarget as defined by W3C DOM 2/3.
 */

/**
 * Namespace for events
 */
goog.provide('goog.events.EventTarget');

/**
 * Dependencies
 */
goog.require('goog.Disposable');
goog.require('goog.events');


/**
 * This implements the EventTarget interface as defined by W3C DOM 2/3. The
 * main difference from the spec is that the this does not know about event
 * propagation and therefore the flag whether to use bubbling or capturing is
 * not used.
 *
 * Another difference is that event objects do not really have to implement
 * the Event interface. An object is treated as an event object if it has a
 * type property.
 *
 * It also allows you to pass a string instead of an event object and in that
 * case an event like object is created with the type set to the string value.
 *
 * Unless propagation is stopped, events dispatched by an EventTarget bubble
 * to its parent event target, returned by <code>getParentEventTarget</code>.
 * To set the parent event target, call <code>setParentEventTarget</code> or
 * override <code>getParentEventTarget</code> in a subclass.  Subclasses that
 * don't support changing the parent event target should override the setter
 * to throw an error.
 *
 * Example usage:
 * <pre>
 *   var et = new goog.events.EventTarget;
 *   function f(e) {
 *      alert("Type: " + e.type + "\nTarget: " + e.target);
 *   }
 *   et.addEventListener("foo", f);
 *   ...
 *   et.dispatchEvent({type: "foo"}); // will call f
 *   // or et.dispatchEvent("foo");
 *   ...
 *   et.removeEventListener("foo", f);
 *
 *  // You can also use the EventHandler interface:
 *  var eh = {
 *    handleEvent: function(e) {
 *      ...
 *    }
 *  };
 *  et.addEventListener("bar", eh);
 * </pre>
 *
 * @constructor
 * @extends {goog.Disposable}
 */
goog.events.EventTarget = function() {
  // Although EventTarget extends Disposable,
  // goog.Disposable.call(this) is omitted for performance reasons.
};
goog.inherits(goog.events.EventTarget, goog.Disposable);


/**
 * Used to tell if an event is a real event in goog.events.listen() so we don't
 * get listen() calling addEventListener() and vice-versa.
 * @type {boolean}
 * @private
 */
goog.events.EventTarget.prototype.customEvent_ = true;


/**
 * Parent event target, used during event bubbling.
 * @type {goog.events.EventTarget?}
 * @private
 */
goog.events.EventTarget.prototype.parentEventTarget_ = null;


/**
 * Returns the parent of this event target to use for bubbling.
 *
 * @return {goog.events.EventTarget} The parent EventTarget or null if there
 * is no parent.
 */
goog.events.EventTarget.prototype.getParentEventTarget = function() {
  return this.parentEventTarget_;
};


/**
 * Sets the parent of this event target to use for bubbling.
 *
 * @param {goog.events.EventTarget?} parent Parent EventTarget (null if none).
 */
goog.events.EventTarget.prototype.setParentEventTarget = function(parent) {
  this.parentEventTarget_ = parent;
};


/**
 * Adds an event listener to the event target. The same handler can only be
 * added once per the type. Even if you add the same handler multiple times
 * using the same type then it will only be called once when the event is
 * dispatched.
 *
 * Supported for legacy but use goog.events.listen(src, type, handler) instead.
 *
 * @param {string} type The type of the event to listen for.
 * @param {Function} handler The function to handle the event. The handler can
 *                           also be an object that implements the handleEvent
 *                           method which takes the event object as argument.
 * @param {boolean} opt_capture In DOM-compliant browsers, this determines
 *                              whether the listener is fired during the
 *                              capture or bubble phase of the event.
 * @param {Object} opt_handlerScope Object in who's scope to call the listener.
 */
goog.events.EventTarget.prototype.addEventListener = function(
    type, handler, opt_capture, opt_handlerScope) {
  goog.events.listen(this, type, handler, opt_capture, opt_handlerScope);
};


/**
 * Removes an event listener from the event target. The handler must be the
 * same object as the one added. If the handler has not been added then
 * nothing is done.
 * @param {string} type The type of the event to listen for.
 * @param {Function} handler The function to handle the event. The handler can
 *                           can also be an object that implements the
 *                           handleEvent method which takes the event object as
 *                           argument.
 * @param {boolean} opt_capture In DOM-compliant browsers, this determines
 *                              whether the listener is fired during the
 *                              capture or bubble phase of the event.
 * @param {Object} opt_handlerScope Object in who's scope to call the listener.
 */
goog.events.EventTarget.prototype.removeEventListener = function(
    type, handler, opt_capture, opt_handlerScope) {
  goog.events.unlisten(this, type, handler, opt_capture, opt_handlerScope);
};


/**
 * Dispatches an event (or event like object) and calls all listeners
 * listening for events of this type. The type of the event is decided by the
 * type property on the event object.
 *
 * If any of the listeners returns false OR calls preventDefault then this
 * function will return false.  If one of the capture listeners calls
 * stopPropagation, then the bubble listeners won't fire.
 *
 * @param {string|Object|goog.events.Event} e Event object.
 * @return {boolean} If anyone called preventDefault on the event object (or
 *     if any of the handlers returns false this will also return false.
 */
goog.events.EventTarget.prototype.dispatchEvent = function(e) {
  return goog.events.dispatchEvent(this, e);
};


/**
 * Unattach listeners from this object.  Classes that extend EventTarget may
 * need to override this method in order to remove references to DOM Elements
 * and additional listeners, it should be something like this:
 * <pre>
 * MyClass.prototype.disposeInternal = function() {
 *   MyClass.superClass_.disposeInternal.call(this);
 *   // Dispose logic for MyClass
 * };
 * </pre>
 */
goog.events.EventTarget.prototype.disposeInternal = function() {
  goog.events.EventTarget.superClass_.disposeInternal.call(this);
  goog.events.removeAll(this);
  this.parentEventTarget_ = null;
};

// Copyright 2006 Google Inc.
// All Rights Reserved
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 
//  * Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
//  * Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in
//    the documentation and/or other materials provided with the
//    distribution.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
// INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
// BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
// LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
// ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE. 

/*
 * @fileoverview Constant declarations for common key codes.
 *
 */

goog.provide('goog.events.KeyCodes');

goog.require('goog.events');


/**
 * Key codes for common characters.
 *
 * This list is not localized and therefor some of the key codes are not correct
 * for non US keyboard layouts. See comments below.
 *
 * @enum {number}
 */
goog.events.KeyCodes = {
  MAC_ENTER: 3,
  BACKSPACE: 8,
  TAB: 9,
  NUM_CENTER: 12,
  ENTER: 13,
  SHIFT: 16,
  CTRL: 17,
  ALT: 18,
  PAUSE: 19,
  CAPS_LOCK: 20,
  ESC: 27,
  SPACE: 32,
  PAGE_UP: 33,     // also NUM_NORTH_EAST
  PAGE_DOWN: 34,   // also NUM_SOUTH_EAST
  END: 35,         // also NUM_SOUTH_WEST
  HOME: 36,        // also NUM_NORTH_WEST
  LEFT: 37,        // also NUM_WEST
  UP: 38,          // also NUM_NORTH
  RIGHT: 39,       // also NUM_EAST
  DOWN: 40,        // also NUM_SOUTH
  PRINT_SCREEN: 44,
  INSERT: 45,      // also NUM_INSERT
  DELETE: 46,      // also NUM_DELETE
  ZERO: 48,
  ONE: 49,
  TWO: 50,
  THREE: 51,
  FOUR: 52,
  FIVE: 53,
  SIX: 54,
  SEVEN: 55,
  EIGHT: 56,
  NINE: 57,
  QUESTION_MARK: 63, // needs localization
  A: 65,
  B: 66,
  C: 67,
  D: 68,
  E: 69,
  F: 70,
  G: 71,
  H: 72,
  I: 73,
  J: 74,
  K: 75,
  L: 76,
  M: 77,
  N: 78,
  O: 79,
  P: 80,
  Q: 81,
  R: 82,
  S: 83,
  T: 84,
  U: 85,
  V: 86,
  W: 87,
  X: 88,
  Y: 89,
  Z: 90,
  META: 91,
  CONTEXT_MENU: 93,
  NUM_ZERO: 96,
  NUM_ONE: 97,
  NUM_TWO: 98,
  NUM_THREE: 99,
  NUM_FOUR: 100,
  NUM_FIVE: 101,
  NUM_SIX: 102,
  NUM_SEVEN: 103,
  NUM_EIGHT: 104,
  NUM_NINE: 105,
  NUM_MULTIPLY: 106,
  NUM_PLUS: 107,
  NUM_MINUS: 109,
  NUM_PERIOD: 110,
  NUM_DIVISION: 111,
  F1: 112,
  F2: 113,
  F3: 114,
  F4: 115,
  F5: 116,
  F6: 117,
  F7: 118,
  F8: 119,
  F9: 120,
  F10: 121,
  F11: 122,
  F12: 123,
  NUMLOCK: 144,
  SEMICOLON: 186,            // needs localization
  DASH: 189,                 // needs localization
  EQUALS: 187,               // needs localization
  COMMA: 188,                // needs localization
  PERIOD: 190,               // needs localization
  SLASH: 191,                // needs localization
  APOSTROPHE: 192,           // needs localization
  SINGLE_QUOTE: 222,         // needs localization
  OPEN_SQUARE_BRACKET: 219,  // needs localization
  BACKSLASH: 220,            // needs localization
  CLOSE_SQUARE_BRACKET: 221, // needs localization
  WIN_KEY: 224,
  MAC_FF_META: 224, // Firefox (Gecko) fires this for the meta key instead of 91
  WIN_IME: 229
};


/**
 * Returns true if the event contains a text modifying key
 * @param {goog.events.BrowserEvent} e A key event.
 * @return {boolean} Whether it's a text modifying key.
 */
goog.events.KeyCodes.isTextModifyingKeyEvent = function(e) {
  if (e.altKey && !e.ctrlKey ||
      e.metaKey ||
      // Function keys don't generate text
      e.keyCode >= goog.events.KeyCodes.F1 &&
      e.keyCode <= goog.events.KeyCodes.F12) {
    return false;
  }

  // The following keys are quite harmless, even in combination with
  // CTRL, ALT or SHIFT.
  switch (e.keyCode) {
    case goog.events.KeyCodes.ALT:
    case goog.events.KeyCodes.SHIFT:
    case goog.events.KeyCodes.CTRL:
    case goog.events.KeyCodes.PAUSE:
    case goog.events.KeyCodes.CAPS_LOCK:
    case goog.events.KeyCodes.ESC:
    case goog.events.KeyCodes.PAGE_UP:
    case goog.events.KeyCodes.PAGE_DOWN:
    case goog.events.KeyCodes.HOME:
    case goog.events.KeyCodes.END:
    case goog.events.KeyCodes.LEFT:
    case goog.events.KeyCodes.RIGHT:
    case goog.events.KeyCodes.UP:
    case goog.events.KeyCodes.DOWN:
    case goog.events.KeyCodes.INSERT:
    case goog.events.KeyCodes.NUMLOCK:
    case goog.events.KeyCodes.CONTEXT_MENU:
    case goog.events.KeyCodes.PRINT_SCREEN:
      return false;
    default:
      return true;
  }
};


/**
 * Returns true if the key fires a keypress event in the current browser.
 *
 * Accoridng to MSDN [1] IE only fires keypress events for the following keys:
 * - Letters: A - Z (uppercase and lowercase)
 * - Numerals: 0 - 9
 * - Symbols: ! @ # $ % ^ & * ( ) _ - + = < [ ] { } , . / ? \ | ' ` " ~
 * - System: ESC, SPACEBAR, ENTER
 *
 * That's not entirely correct though, for instance there's no distinction
 * between upper and lower case letters.
 *
 * [1] http://msdn2.microsoft.com/en-us/library/ms536939(VS.85).aspx)
 *
 * Safari is similar to IE, but does not fire keypress for ESC.
 *
 * Additionally, IE6 does not fire keydown or keypress events for letters when
 * the control or alt keys are held down and the shift key is not. IE7 does
 * fire keydown in these cases, though, but not keypress.
 *
 * @param {number} keyCode A key code.
 * @param {number} opt_heldKeyCode Key code of a currently-held key.
 * @param {boolean} opt_shiftKey Whether the shift key is held down.
 * @return {boolean} Whether it's a key that fires a keypress event.
 */
goog.events.KeyCodes.firesKeyPressEvent = function(keyCode, opt_heldKeyCode,
    opt_shiftKey) {
  if (!goog.userAgent.IE &&
      !(goog.userAgent.WEBKIT && goog.userAgent.isVersion('525'))) {
    return true;
  }

  // Saves Ctrl or Alt + key for IE7, which won't fire keypress.
  if (goog.userAgent.IE &&
      !opt_shiftKey &&
      (opt_heldKeyCode == goog.events.KeyCodes.CTRL ||
       opt_heldKeyCode == goog.events.KeyCodes.ALT)) {
    return false;
  }

  if (keyCode >= goog.events.KeyCodes.ZERO &&
      keyCode <= goog.events.KeyCodes.NINE) {
    return true;
  }

  if (keyCode >= goog.events.KeyCodes.NUM_ZERO &&
      keyCode <= goog.events.KeyCodes.NUM_MULTIPLY) {
    return true;
  }

  if (keyCode >= goog.events.KeyCodes.A &&
      keyCode <= goog.events.KeyCodes.Z) {
    return true;
  }

  if (keyCode == goog.events.KeyCodes.ESC &&
      goog.userAgent.WEBKIT) {
    return false;
  }

  switch (keyCode) {
    case goog.events.KeyCodes.ENTER:
    case goog.events.KeyCodes.ESC:
    case goog.events.KeyCodes.SPACE:
    case goog.events.KeyCodes.QUESTION_MARK:
    case goog.events.KeyCodes.NUM_PLUS:
    case goog.events.KeyCodes.NUM_MINUS:
    case goog.events.KeyCodes.NUM_PERIOD:
    case goog.events.KeyCodes.NUM_DIVISION:
    case goog.events.KeyCodes.SEMICOLON:
    case goog.events.KeyCodes.DASH:
    case goog.events.KeyCodes.EQUALS:
    case goog.events.KeyCodes.COMMA:
    case goog.events.KeyCodes.PERIOD:
    case goog.events.KeyCodes.SLASH:
    case goog.events.KeyCodes.APOSTROPHE:
    case goog.events.KeyCodes.SINGLE_QUOTE:
    case goog.events.KeyCodes.OPEN_SQUARE_BRACKET:
    case goog.events.KeyCodes.BACKSLASH:
    case goog.events.KeyCodes.CLOSE_SQUARE_BRACKET:
      return true;
    default:
      return false;
  }
};


/**
 * Returns true if the key produces a character.
 *
 * @param {number} keyCode A key code.
 * @return {boolean} Whether it's a character key.
 */
goog.events.KeyCodes.isCharacterKey = function(keyCode) {
  if (keyCode >= goog.events.KeyCodes.ZERO &&
      keyCode <= goog.events.KeyCodes.NINE) {
    return true;
  }

  if (keyCode >= goog.events.KeyCodes.NUM_ZERO &&
      keyCode <= goog.events.KeyCodes.NUM_MULTIPLY) {
    return true;
  }

  if (keyCode >= goog.events.KeyCodes.A &&
      keyCode <= goog.events.KeyCodes.Z) {
    return true;
  }

  switch (keyCode) {
    case goog.events.KeyCodes.SPACE:
    case goog.events.KeyCodes.QUESTION_MARK:
    case goog.events.KeyCodes.NUM_PLUS:
    case goog.events.KeyCodes.NUM_MINUS:
    case goog.events.KeyCodes.NUM_PERIOD:
    case goog.events.KeyCodes.NUM_DIVISION:
    case goog.events.KeyCodes.SEMICOLON:
    case goog.events.KeyCodes.DASH:
    case goog.events.KeyCodes.EQUALS:
    case goog.events.KeyCodes.COMMA:
    case goog.events.KeyCodes.PERIOD:
    case goog.events.KeyCodes.SLASH:
    case goog.events.KeyCodes.APOSTROPHE:
    case goog.events.KeyCodes.SINGLE_QUOTE:
    case goog.events.KeyCodes.OPEN_SQUARE_BRACKET:
    case goog.events.KeyCodes.BACKSLASH:
    case goog.events.KeyCodes.CLOSE_SQUARE_BRACKET:
      return true;
    default:
      return false;
  }
};

// Copyright 2007 Google Inc.
// All Rights Reserved
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 
//  * Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
//  * Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in
//    the documentation and/or other materials provided with the
//    distribution.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
// INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
// BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
// LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
// ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE. 

/**
 * @fileoverview This file contains a class for working with keyboard events
 * that repeat consistently across browsers and platforms. It also unifies the
 * key code so that it is the same in all browsers and platforms.
 *
 * Different web browsers have very different keyboard event handling. Most
 * importantly is that only certain browsers repeat keydown events:
 * IE, Opera, FF/Win32, and Safari 3 repeat keydown events.
 * FF/Mac and Safari 2 do not.
 *
 * For the purposes of this code, "Safari 3" means WebKit 525+, when WebKit
 * decided that they should try to match IE's key handling behavior.
 * Safari 3.0.4, which shipped with Leopard (WebKit 523), has the
 * Safari 2 behavior.
 *
 * Firefox, Safari, Opera prevent on keypress
 *
 * IE prevents on keydown
 *
 * Firefox does not fire keypress for shift, ctrl, alt
 * Firefox does fire keydown for shift, ctrl, alt, meta
 * Firefox does not repeat keydown for shift, ctrl, alt, meta
 *
 * Firefox does not fire keypress for up and down in an input
 *
 * Opera fires keypress for shift, ctrl, alt, meta
 * Opera does not repeat keypress for shift, ctrl, alt, meta
 *
 * Safari 2 and 3 do not fire keypress for shift, ctrl, alt
 * Safari 2 does not fire keydown for shift, ctrl, alt
 * Safari 3 *does* fire keydown for shift, ctrl, alt
 *
 * IE provides the keycode for keyup/down events and the charcode (in the
 * keycode field) for keypress.
 *
 * Mozilla provides the keycode for keyup/down and the charcode for keypress
 * unless it's a non text modifying key in which case the keycode is provided.
 *
 * Safari 3 provides the keycode and charcode for all events.
 *
 * Opera provides the keycode for keyup/down event and either the charcode or
 * the keycode (in the keycode field) for keypress events.
 *
 * Firefox x11 doesn't fire keydown events if a another key is already held down
 * until the first key is released. This can cause a key event to be fired with
 * a keyCode for the first key and a charCode for the second key.
 *
 * Safari in keypress
 *
 *        charCode keyCode which
 * ENTER:       13      13    13
 * F1:       63236   63236 63236
 * F8:       63243   63243 63243
 * ...
 * p:          112     112   112
 * P:           80      80    80
 *
 * Firefox, keypress:
 *
 *        charCode keyCode which
 * ENTER:        0      13    13
 * F1:           0     112     0
 * F8:           0     119     0
 * ...
 * p:          112       0   112
 * P:           80       0    80
 *
 * Opera, Mac+Win32, keypress:
 *
 *         charCode keyCode which
 * ENTER: undefined      13    13
 * F1:    undefined     112     0
 * F8:    undefined     119     0
 * ...
 * p:     undefined     112   112
 * P:     undefined      80    80
 *
 * IE7, keydown
 *
 *         charCode keyCode     which
 * ENTER: undefined      13 undefined
 * F1:    undefined     112 undefined
 * F8:    undefined     119 undefined
 * ...
 * p:     undefined      80 undefined
 * P:     undefined      80 undefined
 *
 */


goog.provide('goog.events.KeyEvent');
goog.provide('goog.events.KeyHandler');
goog.provide('goog.events.KeyHandler.EventType');

goog.require('goog.events');
goog.require('goog.events.BrowserEvent');
goog.require('goog.events.EventTarget');
goog.require('goog.events.KeyCodes');
goog.require('goog.userAgent');

/**
 * A wrapper around an element that you want to listen to keyboard events on.
 * XXX(doughtie): {Document|Element} != {Element|Document}.
 * see: http://b/1470354
 * @param {Element|Document} opt_element The element or document to listen on.
 * @constructor
 * @extends {goog.events.EventTarget}
 */
goog.events.KeyHandler = function(opt_element) {
  goog.events.EventTarget.call(this);

  if (opt_element) {
    this.attach(opt_element);
  }
};
goog.inherits(goog.events.KeyHandler, goog.events.EventTarget);


/**
 * This is the element that we will listen to the real keyboard events on.
 * @type {Element|Document|null}
 * @private
 */
goog.events.KeyHandler.prototype.element_ = null;


/**
 * The key for the key press listener.
 * @type {string?}
 * @private
 */
goog.events.KeyHandler.prototype.keyPressKey_ = null;


/**
 * The key for the key down listener.
 * @type {string?}
 * @private
 */
goog.events.KeyHandler.prototype.keyDownKey_ = null;


/**
 * The key for the key up listener.
 * @type {string?}
 * @private
 */
goog.events.KeyHandler.prototype.keyUpKey_ = null;


/**
 * Used to detect keyboard repeat events, and also by Safari to remember the
 * last key so we can prevent duplicate key events from being dispatched.
 * @private
 * @type {number}
 */
goog.events.KeyHandler.prototype.lastKey_ = -1;


/**
 * Keycode recorded for key down events. As most browsers don't report the
 * keycode in the key press event we need to record it in the key down phase.
 * @private
 * @type {number}
 */
goog.events.KeyHandler.prototype.keyCode_ = -1;


/**
 * Used for Safari to remember the last time we got a key event so we can
 * prevent multiple key events from being dispatched.
 * @private
 * @type {number}
 */
goog.events.KeyHandler.prototype.lastTimeStamp_ = 0;


/**
 * If true, repeated key events fired within 50 ms of each other
 * in Webkit browsers will be ignored.
 * @type {boolean}
 */
goog.events.KeyHandler.prototype.ignoreWebkitSpuriousEvents = true;


/**
 * Enum type for the events fired by the key handler
 * @enum {string}
 */
goog.events.KeyHandler.EventType = {
  KEY: 'key'
};


/**
 * An enumeration of key codes that Safari 2 does incorrectly
 * @type {Object}
 * @private
 */
goog.events.KeyHandler.safariKey_ = {
  '3': goog.events.KeyCodes.ENTER, // 13
  '12': goog.events.KeyCodes.NUMLOCK, // 144
  '63232': goog.events.KeyCodes.UP, // 38
  '63233': goog.events.KeyCodes.DOWN, // 40
  '63234': goog.events.KeyCodes.LEFT, // 37
  '63235': goog.events.KeyCodes.RIGHT, // 39
  '63236': goog.events.KeyCodes.F1, // 112
  '63237': goog.events.KeyCodes.F2, // 113
  '63238': goog.events.KeyCodes.F3, // 114
  '63239': goog.events.KeyCodes.F4, // 115
  '63240': goog.events.KeyCodes.F5, // 116
  '63241': goog.events.KeyCodes.F6, // 117
  '63242': goog.events.KeyCodes.F7, // 118
  '63243': goog.events.KeyCodes.F8, // 119
  '63244': goog.events.KeyCodes.F9, // 120
  '63245': goog.events.KeyCodes.F10, // 121
  '63246': goog.events.KeyCodes.F11, // 122
  '63247': goog.events.KeyCodes.F12, // 123
  '63248': goog.events.KeyCodes.PRINT_SCREEN, // 44
  '63272': goog.events.KeyCodes.DELETE, // 46
  '63273': goog.events.KeyCodes.HOME, // 36
  '63275': goog.events.KeyCodes.END, // 35
  '63276': goog.events.KeyCodes.PAGE_UP, // 33
  '63277': goog.events.KeyCodes.PAGE_DOWN, // 34
  '63289': goog.events.KeyCodes.NUMLOCK, // 144
  '63302': goog.events.KeyCodes.INSERT // 45
};


/**
 * An enumeration of key identifiers currently part of the W3C draft for DOM3
 * and their mappings to keyCodes.
 * http://www.w3.org/TR/DOM-Level-3-Events/keyset.html#KeySet-Set
 * This is currently supported in Safari and should be platform independent.
 * @type {Object}
 * @private
 */
goog.events.KeyHandler.keyIdentifier_ = {
  'Up': goog.events.KeyCodes.UP, // 38
  'Down': goog.events.KeyCodes.DOWN, // 40
  'Left': goog.events.KeyCodes.LEFT, // 37
  'Right': goog.events.KeyCodes.RIGHT, // 39
  'Enter': goog.events.KeyCodes.ENTER, // 13
  'F1': goog.events.KeyCodes.F1, // 112
  'F2': goog.events.KeyCodes.F2, // 113
  'F3': goog.events.KeyCodes.F3, // 114
  'F4': goog.events.KeyCodes.F4, // 115
  'F5': goog.events.KeyCodes.F5, // 116
  'F6': goog.events.KeyCodes.F6, // 117
  'F7': goog.events.KeyCodes.F7, // 118
  'F8': goog.events.KeyCodes.F8, // 119
  'F9': goog.events.KeyCodes.F9, // 120
  'F10': goog.events.KeyCodes.F10, // 121
  'F11': goog.events.KeyCodes.F11, // 122
  'F12': goog.events.KeyCodes.F12, // 123
  'U+007F': goog.events.KeyCodes.DELETE, // 46
  'Home': goog.events.KeyCodes.HOME, // 36
  'End': goog.events.KeyCodes.END, // 35
  'PageUp': goog.events.KeyCodes.PAGE_UP, // 33
  'PageDown': goog.events.KeyCodes.PAGE_DOWN, // 34
  'Insert': goog.events.KeyCodes.INSERT // 45
};


/**
 * Map from Gecko specific key codes to cross browser key codes
 * @type {Object}
 * @private
 */
goog.events.KeyHandler.mozKeyCodeToKeyCodeMap_ = {
  61: 187,  // =, equals
  59: 186   // ;, semicolon
};


/**
 * If true, the KeyEvent fires on keydown. Otherwise, it fires on keypress.
 *
 * @type {boolean}
 * @private
 */
goog.events.KeyHandler.USES_KEYDOWN_ = goog.userAgent.IE ||
    goog.userAgent.WEBKIT && goog.userAgent.isVersion('525');


/**
 * Records the keycode for browsers that only returns the keycode for key up/
 * down events. For browser/key combinations that doesn't trigger a key pressed
 * event it also fires the patched key event.
 * @param {goog.events.BrowserEvent} e The key down event.
 * @private
 */
goog.events.KeyHandler.prototype.handleKeyDown_ = function(e) {
  if (goog.events.KeyHandler.USES_KEYDOWN_ &&
      !goog.events.KeyCodes.firesKeyPressEvent(e.keyCode,
          this.lastKey_, e.shiftKey)) {
    this.handleEvent(e);
  } else {
    if (goog.userAgent.GECKO &&
        e.keyCode in goog.events.KeyHandler.mozKeyCodeToKeyCodeMap_) {
      this.keyCode_ = goog.events.KeyHandler.mozKeyCodeToKeyCodeMap_[e.keyCode];
    } else {
      this.keyCode_ = e.keyCode;
    }
  }
};


/**
 * Clears the stored previous key value, resetting the key repeat status. Uses
 * -1 because the Safari 3 Windows beta reports 0 for certain keys (like Home
 * and End.)
 * @param {goog.events.BrowserEvent} e The keyup event.
 * @private
 */
goog.events.KeyHandler.prototype.handleKeyup_ = function(e) {
  this.lastKey_ = -1;
  this.keyCode_ = -1;
};


/**
 * Handles the events on the element.
 * @param {goog.events.BrowserEvent} e  The keyboard event sent from the
 *     browser.
 */
goog.events.KeyHandler.prototype.handleEvent = function(e) {
  var be = e.getBrowserEvent();
  var keyCode, charCode;

  // IE reports the character code in the keyCode field for keypress events.
  // There are two exceptions however, Enter and Escape.
  if (goog.userAgent.IE && e.type == goog.events.EventType.KEYPRESS) {
    keyCode = this.keyCode_;
    charCode = keyCode != goog.events.KeyCodes.ENTER &&
        keyCode != goog.events.KeyCodes.ESC ?
            be.keyCode : 0;

  // Safari reports the character code in the keyCode field for keypress
  // events but also has a charCode field.
  } else if (goog.userAgent.WEBKIT &&
      e.type == goog.events.EventType.KEYPRESS) {
    keyCode = this.keyCode_;
    charCode = be.charCode >= 0 && be.charCode < 63232 &&
        goog.events.KeyCodes.isCharacterKey(keyCode) ?
            be.charCode : 0;

  // Opera reports the keycode or the character code in the keyCode field.
  } else if (goog.userAgent.OPERA) {
    keyCode = this.keyCode_;
    charCode = goog.events.KeyCodes.isCharacterKey(keyCode) ?
        be.keyCode : 0;

  // Mozilla reports the character code in the charCode field.
  } else {
    keyCode = be.keyCode || this.keyCode_;
    charCode = be.charCode || 0;
    // On the Mac, shift-/ triggers a question mark char code and no key code,
    // so we synthesize the latter
    if (goog.userAgent.MAC &&
        charCode == goog.events.KeyCodes.QUESTION_MARK &&
        !keyCode) {
      keyCode = goog.events.KeyCodes.SLASH;
    }
  }

  var key = keyCode;
  var keyIdentifier = be.keyIdentifier;

  // Correct the key value for certain browser-specific quirks.
  if (keyCode) {
    if (keyCode >= 63232 && keyCode in goog.events.KeyHandler.safariKey_) {
      // NOTE(nicksantos): Safari 3 has fixed this problem,
      // this is only needed for Safari 2.
      key = goog.events.KeyHandler.safariKey_[keyCode];
    } else {

      // Safari returns 25 for Shift+Tab instead of 9.
      if (keyCode == 25 && e.shiftKey) {
        key = 9;
      }
    }
  } else if (keyIdentifier &&
             keyIdentifier in goog.events.KeyHandler.keyIdentifier_) {
    // This is needed for Safari Windows because it currently doesn't give a
    // keyCode/which for non printable keys.
    key = goog.events.KeyHandler.keyIdentifier_[keyIdentifier];
  }

  // If we get the same keycode as a keydown/keypress without having seen a
  // keyup event, then this event was caused by key repeat.
  var repeat = key == this.lastKey_;
  this.lastKey_ = key;

  // Safari has a tendency to dispatch the same keypress event twice. If we get
  // the same key within 50ms, let's ignore it.
  if (goog.userAgent.WEBKIT && this.ignoreWebkitSpuriousEvents) {
    if (repeat && be.timeStamp - this.lastTimeStamp_ < 50) {
      return;
    }
    this.lastTimeStamp_ = be.timeStamp;
  }

  var event = new goog.events.KeyEvent(key, charCode, repeat, be);
  try {
    this.dispatchEvent(event);
  } finally {
    event.dispose();
  }
};


/**
 * Adds the proper key event listeners to the element.
 * XXX(doughtie): {Document|Element} != {Element|Document}.
 * see: http://b/1470354
 * @param {Element|Document} element The element to listen on.
 */
goog.events.KeyHandler.prototype.attach = function(element) {
  if (this.keyUpKey_) {
    this.detach();
  }

  this.element_ = element;

  this.keyPressKey_ = goog.events.listen(this.element_,
                                         goog.events.EventType.KEYPRESS,
                                         this);

  // Most browsers (Safari 2 being the notable exception) doesn't include the
  // keyCode in keypress events (IE has the char code in the keyCode field and
  // Mozilla only included the keyCode if there's no charCode). Thus we have to
  // listen for keydown to capture the keycode.
  this.keyDownKey_ = goog.events.listen(this.element_,
                                        goog.events.EventType.KEYDOWN,
                                        this.handleKeyDown_,
                                        false,
                                        this);


  this.keyUpKey_ = goog.events.listen(this.element_,
                                      goog.events.EventType.KEYUP,
                                      this.handleKeyup_,
                                      false,
                                      this);
};


/**
 * Removes the listeners that may exist.
 */
goog.events.KeyHandler.prototype.detach = function() {
  if (this.keyPressKey_) {
    goog.events.unlistenByKey(this.keyPressKey_);
    goog.events.unlistenByKey(this.keyDownKey_);
    goog.events.unlistenByKey(this.keyUpKey_);
    this.keyPressKey_ = null;
    this.keyDownKey_ = null;
    this.keyUpKey_ = null;
  }
  this.element_ = null;
  this.lastKey_ = -1;
};


/**
 * Disposes of the key handler.
 */
goog.events.KeyHandler.prototype.disposeInternal = function() {
  goog.events.KeyHandler.superClass_.disposeInternal.call(this);
  this.detach();
};


/**
 * This class is used for the goog.events.KeyHandler.EventType.KEY event and
 * it overrides the key code with the fixed key code.
 * @param {number} keyCode The adjusted key code.
 * @param {number} charCode The unicode character code.
 * @param {boolean} repeat Whether this event was generated by keyboard repeat.
 * @param {Event} browserEvent Browser event object.
 * @constructor
 * @extends {goog.events.BrowserEvent}
 */
goog.events.KeyEvent = function(keyCode, charCode, repeat, browserEvent) {
  goog.events.BrowserEvent.call(this, browserEvent);
  this.type = goog.events.KeyHandler.EventType.KEY;

  /**
   * Keycode of key press.
   * @type {number}
   */
  this.keyCode = keyCode;

  /**
   * Unicode character code.
   * @type {number}
   */
  this.charCode = charCode;

  /**
   * True if this event was generated by keyboard auto-repeat (i.e., the user is
   * holding the key down.)
   * @type {boolean}
   */
  this.repeat = repeat;
};
goog.inherits(goog.events.KeyEvent, goog.events.BrowserEvent);

/*
 * Chickenfoot end-user web automation system
 *
 * Copyright (c) 2004-2007 Massachusetts Institute of Technology
 * 
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 * 
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 * 
 * Chickenfoot homepage: http://uid.csail.mit.edu/chickenfoot/
 */

/**
 * Chickenfoot: a reference to this XPCOM's global namespace.
 * This is the object that will actually be returned when
 * somebody asks for the wrappedJSObject of the Chickenfoot XPCOM service.
 * 
 * By convention, all XUL or XPCOM code will define this Chickenfoot variable.
 * So if a class or function "F" is defined at the top level in the XPCOM, 
 * it can be referenced from anywhere (XUL or XPCOM land) by simply
 * Chickenfoot.F.
 *
 * Examples: 
 *    Chickenfoot.StringBuffer
 *    Chickenfoot.evaluate()
 *    Chickenfoot.gTriggerManager
 */
var Chickenfoot = this;

var isExportedXpi = false;

// Function.bind and Function.bindAsEventListener are added to support prototype.js
//
// Apparently, adding properties to Function.prototype does not add the properties
// to functions defined in a Chickenscratch script, which is why these properties
// are added at the XPCOM level instead.
//
// TODO: find a cleaner way to integrate prototype.js with Chickenfoot

Function.prototype.bind = function() {
  function $A(iterable) {
    var results = [];
    for (var i = 0; i < iterable.length; i++)
      results.push(iterable[i]);
    return results;
  }
  var __method = this, args = $A(arguments), object = args.shift();
  return function() {
    return __method.apply(object, args.concat($A(arguments)));
  }
}

Function.prototype.bindAsEventListener = function(object) {
  var __method = this;
  return function(event) {
    return __method.call(object, event || window.event);
  }
}


// Global variables
var gTriggerManager;
var global = {}; // user's global variable space

// These classes are not provided in the XPCOM JS environment by default.  So we have
// to get them from the first chrome window's Javascript environment.
// Some of these classes are used by the LAPIS-Chickenfoot bridge, so before you prune
// this list of dead references, make sure they're not used in LAPIS-Chickenfoot either.
var Node;
var NodeFilter;
var Document;
var DocumentFragment;
var DOMParser;
var Element;
var Range;
var XPathResult;
var XMLHttpRequest;
var XULDocument;
var XULElement;

// Initialize the Chickenfoot service.
// This function runs when the Chickenfoot XPCOM service is first requested.
// It can call other parts of Firefox, other XPCOM components, but it doesn't
// have access to any chrome windows.  (Defer window-specific initialization
// to setupWindow(), below).
function setupService() {
  gTriggerManager = new TriggerManager();
  
  // grab a reference to the command-line handler
  chickenfootCommandLineHandler = null
  if (!isExportedXpi) {
    chickenfootCommandLineHandler =
      Components.classes["@uid.csail.mit.edu/ChickenfootCommandLineHandler/;1"].
      getService(Components.interfaces.nsISupports).wrappedJSObject
  }
}

/**
 *  Set up a new chrome window for Chickenfoot.
 *  Called by Chickenfoot's overlay whenever a new Firefox window
 *  appears.
 */
function setupWindow(/*ChromeWindow*/ window) {
  if (!Document) {
      Node = window.Node;
      NodeFilter = window.NodeFilter;
      Document = window.Document;
      DocumentFragment = window.DocumentFragment;
      DOMParser = window.DOMParser;
      Element = window.Element;
      Range = window.Range;
      XMLHttpRequest = window.XMLHttpRequest;
      XPathResult = window.XPathResult;
      XULDocument = window.XULDocument;
      XULElement = window.XULElement;
  }
    
  addTriggerListener(window);
  
  //add a load listener for the install trigger button script, making it a built-in trigger
  var browser = getTabBrowser(window);  
  browser.addEventListener("load", triggerListener, true);
  function triggerListener(event) {
    //if listener is fired for loading a xul document, then ignore it
    var doc = event.originalTarget;
    var win = doc.defaultView;
    if(doc.location == null) { return; }
    
    //if not at the chickenfoot scripts wiki, then ignore it
    if(doc.location.wrappedJSObject.href.match(/http:\/\/groups.csail.mit.edu\/uid\/chickenfoot\/scripts\/index.php\/*/) != null) {
      Chickenfoot.installTriggerButtons(doc);
    }
  }
  
}


/******************************************************************************/

const CLASS_ID    = Components.ID("{7a2ad1d0-29a8-4e2a-97bd-ad6324c0a753}");
const CLASS_NAME  = "Chickenfoot";
const CONTRACT_ID = "@uid.csail.mit.edu/Chickenfoot/;1";

function ChickenfootService() {
  this.wrappedJSObject = Chickenfoot;
  setupService();
}


// The only interface we support is nsISupports.
// All the action happens through wrappedJSObject.
ChickenfootService.prototype.QueryInterface = function(iid) {
  if (!iid.equals(Components.interfaces.nsISupports))
    throw Components.results.NS_ERROR_NO_INTERFACE;
  return this;
}


/* gModule implements Components.interfaces.nsIModule */
var gModule = {

  _firstTime : true,

  _factory : {
      createInstance: function (aOuter, aIID) {
        if (aOuter != null) throw Components.results.NS_ERROR_NO_AGGREGATION;
        return new ChickenfootService().QueryInterface(aIID);
      }
  },

  registerSelf: function(aCompMgr, aFileSpec, aLocation, aType) {
    if (!this._firstTime) throw Components.results.NS_ERROR_FACTORY_REGISTER_AGAIN;
    this._firstTime = false;
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.registerFactoryLocation(CLASS_ID,
                                     CLASS_NAME,
                                     CONTRACT_ID,
                                     aFileSpec,
                                     aLocation,
                                     aType);
  },

  unregisterSelf: function(aCompMgr, aLocation, aType) {
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(CLASS_ID, aLocation);        
  },
  
  getClassObject: function(aCompMgr, aCID, aIID) {
    if (!aIID.equals(Components.interfaces.nsIFactory)) {
      throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    }
    if (aCID.equals(CLASS_ID)) {
      return this._factory;
    }
    throw Components.results.NS_ERROR_NO_INTERFACE;
  },

  canUnload: function(aCompMgr) { return true; }
  
};

function NSGetModule(aCompMgr, aFileSpec) { return gModule; }

/**
 * Evaluate an Chickenscratch script.
 * @param chromeWindow   Firefox chrome window to use for context
 * @param code           String of code to evaluate
 * @param displayResultInConsole   if true, the resulting value is displayed in the Output pane
 * @param win            Particular HTML window (tab) to use for context.
 *                       If omitted, then the currently-visible tab in chromeWindow is used.
 * @param extraContext   Additional variables to define in code's evaluation context.
 *               For example, extraContext often includes:
 *                   scriptDir  (an nsIFile identifying the folder from which the code was loaded)
 *                   scriptURL  (an nsIURL identifying the URL folder from which the code was loaded)
 */ 
function evaluate(/*ChromeWindow*/ chromeWindow,
                  /*String*/ code,
                  /*boolean*/ displayResultInConsole,
                  /*optional HtmlWindow*/ win,
                  /*object*/ extraContext) {
                  
  // Get a reference to the Javascript SubScript loader,�which is used by 
  // chickenscratchEvaluate().
  if (!Chickenfoot.jsLoader) {
    Chickenfoot.jsLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                           .getService(this.Components.interfaces.mozIJSSubScriptLoader);
  }                          
                  
  enableStopButton(chromeWindow);
  if (!win) win = getVisibleHtmlWindow(chromeWindow);
  if (displayResultInConsole) {
    startNewDebug(chromeWindow);
  }

  // Create a fresh Javascript exeuction context using
  // a temporary iframe.
  // Start by making a hidden iframe attached to the chrome window,
  // loaded with the chickenscratch evaluation XUL.
  var doc = chromeWindow.document;
  var root = doc.documentElement;
  var frame = doc.createElement("iframe");
  frame.setAttribute("collapsed", "true");
  frame.setAttribute("src", "chrome://chickenfoot/content/chickenscratch.xul");  
  root.appendChild(frame);
  
  // have to wait for the new iframe to finish loading before we can
  // use its JS context.
  var frameWin = frame.contentWindow;
  frameWin.addEventListener("load", loaded, false);
  
  function loaded() {
    // Defer running the user's code, because we're currently blocked
    // in a network handling thread.  If we try to run the user's code
    // right here, it will hang when trying to get the current document.
    frameWin.setTimeout(readyToEvaluate, 0);
  }
  
  function readyToEvaluate() {
    // grab the evaluation function from the new evaluation context
    var context = frameWin.context;
    var chickenscratchEvaluate = frameWin.chickenscratchEvaluate;
    
    // Now that we have the new Javascript execution context, destroy the frame.
    // We do this *before* evaluating the user's code, rather than *after*,
    // because destroying the frame clears its global object of 
    // all user-defined identifiers.  We don't want to destroy any
    // identifiers put there by the user's code, in case the user registered
    // event handlers that require them and that will stick around after the
    // evaluation.  As long as we hold a reference to something in the JS
    // execution context, it will continue to stay around.
    root.removeChild(frame);

    // create the Chickenfoot evaluation context
    getEvaluationContext(context, chromeWindow, win, chickenscratchEvaluate, extraContext);
    try {
      checkForStop();      
      var result = chickenscratchEvaluate(context, code);
      if (result !== undefined && displayResultInConsole) {
        printDebug(chromeWindow, result);
      }
      disableStopButton(chromeWindow);
    } catch (e) {
      debug(e);
      disableStopButton(chromeWindow);
      throw e; // this ensures that the exception appears in the Javascript console
    }
  }
}

function evaluateFile(/*ChromeWindow*/ chromeWindow, 
                      /*String*/ filename, 
                      /*object*/ extraContext) {
  var path = filename
  if (!SimpleIO.exists(path)) {    
      path = TriggerManager._getChickenfootProfileDirectory();
      path.append(filename);
  }
  if (!SimpleIO.exists(path)) {
      path = TriggerManager._getChickenfootProfileDirectory();
      path.append(filename + ".js");
  }  
  if (!SimpleIO.exists(path)) {
      throw "could not run script: " + path.path 
  }

  var source = SimpleIO.read(path);
  var win = getVisibleHtmlWindow(chromeWindow);
  extraContext.scriptDir = path.parent;
  return evaluate(chromeWindow, source, false, win, extraContext);
}


/**
 * Return an object containing the properties and commands 
 * that Chickenscratch scripts can call.
 */ 
function getEvaluationContext(/*Object*/ context,
                              /*ChromeWindow*/ chromeWindow,
                              /*HtmlWindow*/ win,
                              /*EvaluatorFunction*/ chickenscratchEvaluate,
                              /*optional object*/ extraContext) {
// In theory, we could add these properties and commands directly to the
// fresh global object created by evaluate().  In practice, we can't,
// because at least one property (location) is protected by that global
// object, throwing an exception if you try to replace it.  So we create
// a fresh object for the Chickenfoot command space and use mozIJSSubScriptLoader
// to make sure the user's script is evaluated in the scope of that object.

  // getters for important objects
  context.window getter= function getWindow() { return win; };
  context.document getter= function getDocument() { return getLoadedHtmlDocument(chromeWindow, win); };
  context.chromeWindow getter= function getChromeWindow() { return chromeWindow; };
  context.tab getter= function getTab() { return new Tab(win); };
  context.scriptDir = null;
  context.scriptURL = null;
  
  // delegate to properties of window
  context.location getter= function() { return win.location; };
  context.frames getter= function() { return win.frames; };
  context.frameElement getter= function() { return win.frameElement; };
  context.history getter= function() { return win.history; };
  context.screen getter= function() { return win.screen; };

  context.fullScreen getter= function() { return win.fullScreen; };
  context.fullScreen setter= function(msg) { win.fullScreen = msg; };
  context.status getter= function() { return win.status; };
  context.status setter= function(msg) { win.status = msg; };
  context.defaultStatus getter= function() { return win.defaultStatus; };
  context.defaultStatus setter= function(msg) { win.defaultStatus = msg; };
  context.navigator getter= function() { return win.navigator; };

  // delegate to methods of window
  context.alert = function() { return win.alert.apply(win, arguments); };
  context.atob = function() { return win.atob.apply(win, arguments); };
  context.back = function() { return win.back.apply(win, arguments); };
  context.btoa = function() { return win.btoa.apply(win, arguments); };
  context.close = function() { return win.close.apply(win, arguments); };
  context.confirm = function() { return win.confirm.apply(win, arguments); };
  context.forward = function() { return win.forward.apply(win, arguments); };
  context.getComputedStyle = function() { return win.getComputedStyle.apply(win, arguments); };
  context.home = function() { return win.home.apply(win, arguments); };
  context.open = function() { return win.open.apply(win, arguments); };
  context.openDialog = function() { return win.openDialog.apply(win, arguments); };
  context.opener = function() { return win.opener.apply(win, arguments); };
  context.print = function() { return win.print.apply(win, arguments); };
  context.prompt = function() { return win.prompt.apply(win, arguments); };
  context.stop = function() { return win.stop.apply(win, arguments); };

  // delegate to chromeWindow for these methods, because
  // window clears them every time a new page is visited
  context.setInterval = function() { return chromeWindow.setInterval.apply(chromeWindow, arguments); };
  context.setTimeout = function() { return chromeWindow.setTimeout.apply(chromeWindow, arguments); };
  context.clearInterval = function() { return chromeWindow.clearInterval.apply(chromeWindow, arguments); };
  context.clearTimeout = function() { return chromeWindow.clearTimeout.apply(chromeWindow, arguments); };

  // core client-side Javascript classes
  context.Packages getter= function() { return chromeWindow.Packages; };
  context.java getter= function() { return chromeWindow.java; };
  context.Node getter= function() { return chromeWindow.Node; };
  context.NodeFilter getter= function() { return chromeWindow.NodeFilter; };
  context.Document getter= function() { return chromeWindow.Document; };
  context.DocumentFragment getter= function() { return chromeWindow.DocumentFragment; };
  context.DOMParser getter= function() { return chromeWindow.DOMParser; };
  context.Element getter= function() { return chromeWindow.Element; };
  context.Range getter= function() { return chromeWindow.Range; };
  context.XPathResult getter= function() { return chromeWindow.XPathResult; };
  context.XMLHttpRequest getter= function() { return chromeWindow.XMLHttpRequest; };
  context.Components getter= function() { return chromeWindow.Components; };
  
  // Chickenfoot commands
  context.go = function go(url, reload) { goImpl(win, url, reload); };
  context.fetch = function fetch(url) { return openTabImpl(chromeWindow, url, false, true); };
  context.reload = function reload() { win.location.reload(); };
  
  context.find = function find(pattern) { return Pattern.find(context.document, pattern); };
  context.click = function click(pattern) { clickImpl(context.document, pattern, chromeWindow, undefined, context.__feedbackHandler); };
  context.enter = function enter(pattern,value) { enterImpl(context.document, pattern, value, undefined, context.__feedbackHandler); };
  context.keypress = function keypress(keySequence, destination) { keypressImpl(context.document, keySequence, destination); };
  context.pick = function pick(listPattern,choicePattern,checked) { pickImpl(context.document, arguments, undefined, context.__feedbackHandler); };
  context.unpick = function unpick(listPattern,choicePattern,checked) { unpickImpl(context.document, arguments, context.__feedbackHandler); };
  context.check = function check(pattern) { checkImpl(context.document, pattern, undefined, context.__feedbackHandler); };
  context.uncheck = function uncheck(pattern) { uncheckImpl(context.document, pattern, undefined, context.__feedbackHandler); };
  context.reset = function reset(pattern) { resetImpl(context.document, pattern); };
  
  context.insert = function insert(pattern, chunk) { return insertImpl(context.document, pattern, chunk); };
  context.remove = function remove(pattern) { return removeImpl(context.document, pattern); };
  context.replace = function replace(pattern, chunk) { return replaceImpl(context.document, pattern, chunk); };

  context.onClick = function onClick(pattern, handler) { return onClickImpl(context.document, pattern, handler); };
  context.onKeypress = function onKeypress(pattern, handler, destination) { return onKeypressImpl(context.document, pattern, handler, destination); };
  
  context.select = function select(pattern) { return selectImpl(context.document, pattern); }
  
  context.savePage = function savePage(saveLocationOrName) { savePageImpl(chromeWindow, context.document,  saveLocationOrName); };
  context.savePageComplete = function savePageComplete(saveLocationOrName) { savePageCompleteImpl(chromeWindow, context.document, saveLocationOrName); };
  context.printPage = function printPage(printerName) { printPageImpl(chromeWindow, printerName); };
  
  // file io (deprecated -- users should now include fileio.js)
  context.read = function read(filename) { throw "need to include(\"fileio.js\") before calling read" };
  context.write = function write(filename, data) { throw "need to include(\"fileio.js\") before calling write" };
  context.append = function append(filename, data) { throw "need to include(\"fileio.js\") before calling append" };
  context.exists = function exists(filename) { throw "need to include(\"fileio.js\") before calling exists" };

  //password manager operators
  context.addPassword = function(hostname, username, password, formSubmitURL, usernameField, passwordField) {return addPasswordImpl(hostname, username, password, formSubmitURL, usernameField, passwordField); };
  context.removePassword = function(hostname, username) {return removePasswordImpl(hostname, username); };  
  context.getPassword = function(hostname, username) {return getPasswordImpl(hostname, username); };
  
  // pattern operators
  context.before = function before(pattern) { return beforeImpl(context.document, pattern); };
  context.after = function after(pattern) { return afterImpl(context.document, pattern); };

  context.output = function output() { 
    for (var i = 0; i < arguments.length; ++i) {
      printDebug(chromeWindow, arguments[i]); 
    }
  };
  context.clear = function clear() { clearDebugPane(chromeWindow); };
  context.list = function list(obj, opt_regexp) { printDebug(chromeWindow, listImpl(obj, opt_regexp)); };
  context.include = function include(path, opt_namespace) { return includeImpl(path, context, opt_namespace); };
  context.localUrl = function localUrl(url) { return localUrlImpl(url); };

  context.openTab = function openTab(url, show) { return openTabImpl(chromeWindow, url, show); };
  context.withTab = function withTab(tab, func) {
    try { 
      var origWin = win; win = tab._window; 
      return func.apply(null, Array.prototype.slice.call(arguments,2));
    } finally { win = origWin }
  }
  
  context.Chrome = function openChrome(cwin) { return new Chrome(cwin ? cwin : chromeWindow); };
  context.chrome getter = function getChrome() { return new Chrome(chromeWindow); };

  context.wait = function wait(tabs) { return waitImpl(chromeWindow, tabs, true); };
  context.ready = function ready(tabs) { return waitImpl(chromeWindow, tabs, false); };
  context.sleep = function sleep(seconds) { return sleepImpl(chromeWindow, parseInt(seconds*1000)); };
  
  context.whenLoaded = function whenLoaded(func, win) { 
    return whenLoadedImpl(chromeWindow, func, win); 
  };
  
  // constructors
  context.Link = Link;
  context.Button = Button;
  context.XPath = XPath;
  
  // internal access to Chickenfoot code
  context.Chickenfoot = Chickenfoot;
  context.chickenscratchEvaluate = chickenscratchEvaluate;
  // global space for sharing data between script runs
  context.global getter = function getGlobal() { return global; };
  context.goog getter = function() {
    var obj = {};
    obj.provide = function(name) {
      Chickenfoot.goog.provide(name, context);
    };
    obj.__proto__ = Chickenfoot.goog;
    return obj;
  };

  // additional context
  if (extraContext) {
      for (var k in extraContext) {
        context[k] = extraContext[k]
      }
  }
      
  return context;
}


// If true, running Chickenfoot scripts will be interrupted.
// This may take some time, so it's good to set this to true
// for some interval before setting it back to false.
var stoppingAllScripts = false;

// called periodically by Chickenfoot commands to check whether the user
// wants to interrupt the script.  Throws an exception if so.
function checkForStop() {
  if (stoppingAllScripts) throw new UserStopped();
}

// called by frontend when user presses Stop button.
function stopAllScripts(/*ChromeWindow*/ chromeWindow) {
  stoppingAllScripts = true;
  chromeWindow.setTimeout(function() { 
      stoppingAllScripts = false; 
      disableStopButton(chromeWindow, true);
  }, 500);
}

function UserStopped() {
}
UserStopped.prototype.toString = function() { return "Script cancelled: user pressed Stop button"; }

// number of scripts currently in progress
var scriptsRunning = 0;

function enableStopButton(/*ChromeWindow*/ chromeWindow) {
  ++scriptsRunning;
  setStopButtonEnabled(chromeWindow, true);
}

function disableStopButton(/*ChromeWindow*/ chromeWindow, /*optional boolean*/allScriptsStopped) {
  if (allScriptsStopped) scriptsRunning = 0;
  else --scriptsRunning;
  
  if (!scriptsRunning) setStopButtonEnabled(chromeWindow, false);
}

function setStopButtonEnabled(/*ChromeWindow*/ chromeWindow, /*boolean*/ enabled) {
  var sbwin = getSidebarWindow(chromeWindow);
  if (!sbwin) return; // Chickenfoot sidebar isn't open
  
  var stopButton = sbwin.document.getElementById("cfStopButton");
  if (!stopButton) return;
  
  stopButton.disabled = !enabled;
}

function SimpleIO() {}

/**
 * @param fileNameOrURL the file or URL to be read (either nsIFile or String)
 * @return string - the contents of the file
 * @throws exception if file not found or other I/O error
 */
SimpleIO.read = function(/*nsIFile or String*/ fileNameOrURL) {
  if (isRemoteURL(fileNameOrURL)) {
    return loadRemoteURL(fileNameOrURL);
  } else if (isLocalURL(fileNameOrURL)) {
    return loadLocalURL(fileNameOrURL);
  } else {
    return loadFile(fileNameOrURL);
  }

  function isRemoteURL(/*any*/ obj) {
    return (typeof obj == 'string' || instanceOf(obj, String)) &&
       obj.toString().match(/^(https?|ftp):\/\//);
  }
  function loadRemoteURL(/*string*/ url) {
    // TODO(mbolin): Creating the XMLHttpRequest fails for me
    // on Mac OS 10.6.1, Firefox 3.5.3. This causes includeTest.js to fail.
    var request = new XMLHttpRequest();

    var asynchronous = false;
    var scriptContent = null;
    request.open("GET", url, asynchronous);
    request.send(null);
    if (request.status == 200) {
      return request.responseText;
    } else {
      throw new Error('read error: ' + request.status + ' ' + request.statusText);
    }
  }

  function isLocalURL(/*any*/ obj) {
    return (typeof obj == 'string' || instanceOf(obj, String)) &&
       obj.toString().match(/^(file|chrome|data|resource):\/\//);
  }
  function loadLocalURL(/*string*/ url) {
    // http://forums.mozillazine.org/viewtopic.php?p=921150
    var ioService=Components.classes["@mozilla.org/network/io-service;1"]
      .getService(Components.interfaces.nsIIOService);
    var scriptableStream=Components
      .classes["@mozilla.org/scriptableinputstream;1"]
      .getService(Components.interfaces.nsIScriptableInputStream);  
    var channel = ioService.newChannel(url, null, null);
    var input=channel.open();
    scriptableStream.init(input);
    var str=scriptableStream.read(input.available());
    scriptableStream.close();
    input.close();
    return str;
  }
  
  function loadFile(/*nsIFile or string*/ fileName) {
      // http://kb.mozillazine.org/index.phtml?title=Dev_:_Extensions_:_Example_Code_:_File_IO#Reading_from_a_file
      var file = instanceOf(fileName, Components.interfaces.nsIFile)
         ? fileName : SimpleIO.toFile(fileName);
      var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"]
        .createInstance(Components.interfaces.nsIFileInputStream);
      var sstream = Components.classes["@mozilla.org/scriptableinputstream;1"]
        .createInstance(Components.interfaces.nsIScriptableInputStream);
    
      fstream.init(file, 1, 0, false);
      sstream.init(fstream);
      var data = "" + sstream.read(-1);
      sstream.close();
      fstream.close();
      var utf8Converter = Components.classes["@mozilla.org/intl/utf8converterservice;1"]
         .getService(Components.interfaces.nsIUTF8ConverterService);
      data = utf8Converter.convertURISpecToUTF8 (data, "UTF-8"); 
      return data;  
  }
}


/**
 * @param file the file to be opened (either nsIFile or String)
 * @param string data the content to be written to the file
 * @throws exception if file not found or other I/O error
 *
 * Write the data as UTF-8 rather than straight bytes.
 */
// http://kb.mozillazine.org/index.phtml?title=Dev_:_Extensions_:_Example_Code_:_File_IO
SimpleIO.write = function(/*nsIFile or String*/ fileName,
                          /*string*/ data, 
                          /*optional boolean*/ append) {
    
  if (append && !SimpleIO.exists(fileName)) {
      return SimpleIO.write(fileName, data, false)
  } else {    
      var file = instanceOf(fileName, Components.interfaces.nsIFile)
          ? fileName : SimpleIO.toFile(fileName);
      if (file.parent) SimpleIO.makeDir(file.parent);
            
      var stream = Components.classes["@mozilla.org/network/file-output-stream;1"]
        .createInstance(Components.interfaces.nsIFileOutputStream);
      // use  to open file for appending.
      stream.init(file, 
                  append ? (0x02 | 0x10)
                         : (0x02 | 0x08 | 0x20), // write, create, truncate
                  0664, 0); 
      var os = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
               .createInstance(Components.interfaces.nsIConverterOutputStream);
      os.init(stream, "UTF-8", 0, 0x0000);
      os.writeString(data);
      os.close();
      stream.close();
  }
}

/**
 * @param file the file to be opened (either nsIFile or String)
 * @param string data the content to be written to the file
 * @throws exception if file not found or other I/O error
 *
 * Write the data as straight bytes.
 */
SimpleIO.writeBytes = function(/*nsIFile or String*/ fileName,
                               /*string*/ data, 
                               /*optional boolean*/ append) {
    
  if (append && !SimpleIO.exists(fileName)) {
      return SimpleIO.write(fileName, data, false)
  } else {    
      var file = instanceOf(fileName, Components.interfaces.nsIFile)
          ? fileName : SimpleIO.toFile(fileName);
      if (file.parent) SimpleIO.makeDir(file.parent);
      
      var stream = Components.classes["@mozilla.org/network/file-output-stream;1"]
        .createInstance(Components.interfaces.nsIFileOutputStream);
      // use  to open file for appending.
      stream.init(file, 
                  append ? (0x02 | 0x10)
                         : (0x02 | 0x08 | 0x20), // write, create, truncate
                  0664, 0); 
      stream.write(data, data.length);
      stream.close();
  }
}

/**
 * @param fileName (string) filename
 * @param dir (optional nsIFile) directory where the file should be referenced;
 *                        defaults to downloadDir() if not given
 * @return nsIFile object representing fileName
 */
SimpleIO.toFile = function(/*String*/ fileName, /*optional nsIFile*/ dir) {  
  var file = Components.classes["@mozilla.org/file/local;1"].
	             createInstance(Components.interfaces.nsILocalFile);
  try {
    // absolute pathname?
    file.initWithPath(fileName);
    return file;
  } catch (e) {
    // not an absolute pathname
  }
  
  // interpret relative filenames with respect to dir 
  file = (dir) ? dir.clone() : SimpleIO.downloadDir();
  
  // handle subdirectories in the relative filename
  var parts = fileName.split(/[\\\/]/);
  for (var i = 0; i < parts.length; ++i) {
    if (parts[i]) file.append(parts[i]);
  }
  
  return file;
}

/**
 * @param fileName string filename
 * @return nsIFile object representing fileName in Chickenfoot's directory in the current profile.
 *   (Doesn't check whether the file actually exists, of course)
 */
SimpleIO.toFileInChickenfootDirectory = function(/*String*/ fileName) {
  var profileDirectory = Components.classes["@mozilla.org/file/directory_service;1"]
    .getService(Components.interfaces.nsIProperties)
    .get("ProfD", Components.interfaces.nsILocalFile);
  var myFile = profileDirectory.clone();
  myFile.append("chickenfoot");
  myFile.append(fileName);
  return myFile;
}

/**
 * On Linux, calling file.exists() may throw an exception instead
 * of just returning false, so we wrap file.exists() in a try/catch here
 */
SimpleIO.exists = function(/*nsIFile or String*/ fileName) {
  if (!fileName) return false;
  try {
    var file = instanceOf(fileName, Components.interfaces.nsIFile)
        ? fileName : SimpleIO.toFile(fileName);
    return file.exists();
  } catch(e) {
    return false;
  }
}

/**
 *Checks whether a path is a valid file system path or not
 * @param fileName string Name of file.
 */
SimpleIO.checkPathValidity = function(/*String*/ fileName) {
  if (!fileName) return false;
  var file = Components.classes["@mozilla.org/file/local;1"].
	             createInstance(Components.interfaces.nsILocalFile);
  try {
    file = file.initWithPath(fileName);
    return true;
  } catch(e) {
    return false;
  }
}

/**
 * Values returned by PrefBranch.getPrefType().
 * TODO(mbolin): Find a better place for this enum to live.
 * @enum {number}
 */
SimpleIO.PrefType = {
  INVALID: 0,  
  STRING: 32, 
  INT: 64,
  BOOL: 128
};


/**
 * @return nsIFile representing download directory for firefox
 */
SimpleIO.downloadDir = function () {
  var downloadPref = Components.classes["@mozilla.org/preferences-service;1"].
                         getService(Components.interfaces.nsIPrefService).
                         getBranch('browser.download.').
                         QueryInterface(Components.interfaces.nsIPrefBranch2);
  if (downloadPref.getIntPref('folderList') == 0) {
    return SimpleIO.desktopDir();
  } else if (downloadPref.getPrefType('dir') == SimpleIO.PrefType.STRING) {
    var dir =  SimpleIO.toFile(downloadPref.getCharPref('dir'));
	  return dir.clone();
  } else {
    // No download dir set in about:config.
    var downloadManager = Components.classes["@mozilla.org/download-manager;1"].
        getService(Components.interfaces.nsIDownloadManager);
    return downloadManager.defaultDownloadsDirectory;
  }
};


/**
 * @return nsIFile object representing desktop directory of the operating system
 */
SimpleIO.desktopDir = function () {
  var file = Components.classes["@mozilla.org/file/directory_service;1"]
                       .getService(Components.interfaces.nsIProperties)
                       .get("Desk", Components.interfaces.nsIFile);
  return file.clone();
}

/**
 * @return nsIFile object representing home directory of the operating system.
 */
SimpleIO.homeDir = function () {
  var file = Components.classes["@mozilla.org/file/directory_service;1"]
                       .getService(Components.interfaces.nsIProperties)
                       .get("Home", Components.interfaces.nsIFile);
  return file.clone();
}

/**
 * Makes a directory.  Does nothing if directory already exists.
 *
 * @param dirName (string or nsIFile) directory to be created
 */
SimpleIO.makeDir = function(/*String*/ dirName) {
  var dir = instanceOf(dirName, Components.interfaces.nsIFile)
     ? dirName : SimpleIO.toFile(dirName);
  if (!dir.exists() || !dir.isDirectory()) {
    dir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0664);
  }
}

SimpleIO.getChromeContent = SimpleIO.read;

/**
 * Makes a selection from a listbox, dropdown, set of radio buttons,
 * or checkbox.
 * Two arguments are bound up into a list (for the convenience of pick()):
 *    choicePattern is required
 *    checked indicates whether the choice should be selected or unselected.  May be omitted, defaults to true.
 * Throws exception if ambiguity or failure to match.
 */
function checkImpl(/*Document*/doc, /*choicePattern*/choicePattern, /*optional Range*/ context, /*optional function*/ feedbackHandler) {
  doCheck(doc, choicePattern, true, "check", context, feedbackHandler);
}

function uncheckImpl(/*Document*/doc, /*choicePattern*/choicePattern, /*optional Range*/ context, /*optional function*/ feedbackHandler) {
  doCheck(doc, choicePattern, false, "uncheck", context, feedbackHandler);
}

function doCheck (/*Document*/doc, 
                 /*Pattern*/choicePattern, 
                 /*boolean*/ value,
                 /*string*/ commandName,
                 /*optional Range*/ context, 
                 /*optional function*/ feedbackHandler) {
  var bestMatch = null;
  // find best option, radio button, or checkbox in the whole document
  var m = Pattern.find(doc, choicePattern, [Pattern.CHECKBOX, Pattern.RADIOBUTTON], context);
  if (m.count == 0) {
    throw addMatchToError(new Error("No match for " + commandName + "(" + choicePattern + ")"), m);
  } else if (m.count > 1) {
    throw addMatchToError(new Error("More than one best match for " + commandName + "(" + choicePattern + ")"), m);
  }    
  bestMatch = m;
  
  var node = bestMatch.element;
  
  if (feedbackHandler) feedbackHandler(node, doTheCheck);
  else doTheCheck();
  
  function doTheCheck() {  
      simulateCheck(node, value);
  }
}

/**
 * Simulate a selection of a radio button, or checkbox.
 * Changes the value of the selection, and fires mouse events and change events.
 */
function simulateCheck(/*RadioButton or Checkbox Node*/ node, /*boolean*/ value) {
  if (node.wrappedJSObject) {node = node.wrappedJSObject;}
  //selected or checked as a property in XUL covers most
  //radiobuttons and checkboxes
  if ((instanceOf(node.ownerDocument, XULDocument))
     && ((("selected" in node) && (value != node.selected))
       || (("checked" in node) && (value != node.checked))
       || (isListitem(node))
       || (isMenuItem(node)))) {
    //a direct click() event is fired to the node to reach anonymous content
    //which seems to be unaffected by firing mouse events at it
     node.click() }
  
  //for xul radiobuttons with selected only as an attribute
  else if ((instanceOf(node.ownerDocument, XULDocument))
         && (node.hasAttribute('selected'))
         && (value != (node.getAttribute('selected')))) {
         node.click();
         node.setAttribute('selected', value); }
         
  //for xul checkboxes with checked only as an attribute
  else if ((instanceOf(node.ownerDocument, XULDocument))
          && (node.hasAttribute('checked'))
          && (value != (node.getAttribute('checked')))) {
          node.click();
          node.setAttribute('checked', value); }
  
  //for html elements that do not need a click event to be sent at all        
  //select the option
  else {
    if ("selected" in node) {
    node.selected = value;
    } else if ("checked" in node) {
    node.checked = value;
    } else {
    throw addMatchToError(new Error("Don't know how to check " + node), nodeToMatch(node));
    } 
  }
  
  // simulate the change event
  fireEvent('change', node);
}
/**
 * Contains the code for the click() primitive
 */

// TODO(mbolin): determine whether pattern should be a String.
// For Gmail, there is a fake "All" link, so it is intuitive to try this:
//
// click("All");
//
// Right now, this will fail because Pattern.find(doc, "All", [Pattern.LINK, Pattern.BUTTON])
// will not find anything using the current heuristic. The alternative is to do:
//
// find("All").click();
//
// This should work with the automated mouse event, but it would not work doing things
// the old way. Another thing that users may try is:
//
// click(find("All"));
//
// This does not seem to work because the argument to click() is not a String.
// This should probably be changed so that anything that constitutes a Pattern
// (according to the developer's Wiki) is valid.

/**
 * Clicks the link or button that best matches pattern.
 */
function clickImpl(/*Document*/ doc, /*string*/ pattern, /*chromeWindow*/chrome, /*optional Match*/ context, /*optional function*/ feedbackHandler) {
  var m = Pattern.find(doc, pattern, [Pattern.LINK, Pattern.BUTTON, Pattern.MENU, Pattern.LISTITEM,
                                      Pattern.CHECKBOX, Pattern.RADIOBUTTON, Pattern.TAB], context);
  // It is possible that the user is trying to use do "click('foo')" to
  // click a <SPAN> such as:
  //
  //   <SPAN onmousedown="doFoo()">Click for foo</SPAN>
  //
  // In such a case, the LINK and BUTTON patterns will not return any results,
  // so try STRING_LITERAL instead.  
  if (m.count == 0) {
    m = Pattern.find(doc, pattern, [Pattern.TEXT], context);
  }
  
  if (m.count >1) {
    temp = Pattern.find(doc, pattern, null, context);
    if (temp.count == 1) {m = temp;} }
  
  // make sure exactly one best match
  if (m.count == 0) {
    throw addMatchToError(new Error("No match for click(" + pattern + ")"), m);
  } else if (m.count > 1) {
    throw addMatchToError(new Error("More than one best match for click(" + pattern + ")"), m);
  }

  // click on the one best match
  var element = m.element;
  if (!element) element = rangeToContainer(m.range);
  if (!element || element.nodeType != Node.ELEMENT_NODE) {
    throw addMatchToError(new Error('match does not correspond to a Range that can be clicked'), m);
  }
  
  /*
   * If you run the following Chickenscratch code on a page:
   *
   * document.addEventListener('click', function(event) { output('click') }, false);
   * document.addEventListener('mousedown', function(event) { output('down') }, false);
   * document.addEventListener('mouseup', function(event) { output('up') }, false);
   *
   * And then left-click on the page, you will see the following output:
   *
   * down
   * up
   * click
   *
   * (The order in which the listeners are added does not affect the order
   * of the output in the console.)
   *
   * If you programmatically fire a mousedown and a mouseup, then Firefox will not
   * synthesize those two events into a click, so the click must be fired explicitly.
   *
   * On some webapps, such as Gmail, event handlers are added to respond to mousedown
   * events rather than click events, so all three pieces of the event
   * (mousedown, mouseup, click) are fired by Chickenfoot to provide better automation.
   */
  node = m.element;
  if (node.wrappedJSObject) {node = node.wrappedJSObject;}
  
  if (feedbackHandler) feedbackHandler(node, doClick);
  else doClick();
  
  function doClick() {  
      fireMouseEvent('mousedown', node);
      fireMouseEvent('mouseup', node);
      if (node.click) { node.click(); }
      var allowDefaultAction = fireMouseEvent('click', node);
    
      if (node.tagName == 'menu') { //|| (node.tagName.toLowerCase() == 'menulist')) {
          menuBox = node.boxObject.QueryInterface(Components.interfaces.nsIMenuBoxObject)
          menuBox.openMenu(true);
          node.open = true
          
          //this event listener makes sure that the popup will close again with any other click event
          function closeMenus(event) {
            menus = doc.getElementsByTagName('menu')
            var i=0
            while (i<menus.length) {
                if (menus[i].wrappedJSObject) {menus[i].wrappedJSObject.open = false;}
                else {menus[i].open = false;}
                menus[i].boxObject.QueryInterface(Components.interfaces.nsIMenuBoxObject).openMenu(false); 
                i += 1
              }}
           if (chrome) {chrome.addEventListener("click", closeMenus, false);}
           else {doc.addEventListener("click", closeMenus, false);}
       }
       
       if (allowDefaultAction
          && upperCaseOrNull(element.tagName) == "A"
          && element.href
          && !element.target) {
        // We want to exclude anchor tags that are not links, such as:
        // <a name="section2">Section 2: Related Work</a>
        // Ideally, we would check if element is in doc.links, but that
        // may be expensive if there are a lot of links
         doc.defaultView.location = element.toString();
       }
   }
}
/* controls.js
 *
 * This suite of commands allows the client to add controls
 * to a web page that can run commands with chrome permissions
 * when clicked on.
 *
 */

/**
 * Link object.
 */
function Link(label, func) {
  this.label = label.toString();
  this.func = makeEventHandler(func);
}

Link.prototype.toNode = function(/*Range*/ range) {
  var doc = range.startContainer.ownerDocument;
  var node = doc.createElement("A");
  node.setAttribute("href", "javascript:void(0)");
  node.appendChild(doc.createTextNode(this.label));
  if (this.func) node.addEventListener("click", this.func, false);
  return node;
}

Link.prototype.toString = function() {
  return '<A href="javascript:void(\'' + escape(this.func.name) + '\')">' + this.label + '</A>';
}

/**
 * Button object.
 */
function Button(label, func) {
  this.label = label.toString();
  this.func = makeEventHandler(func);
}

Button.prototype.toNode = function(/*Range*/ range) {
  var doc = range.startContainer.ownerDocument;
  var node = doc.createElement("INPUT");
  node.setAttribute("type", "BUTTON");
  node.setAttribute("value", this.label.toString());
  if (this.func) node.addEventListener("click", this.func, false);
  return node;
}

Button.prototype.toString = function() {
  return '<INPUT type="BUTTON" onclick="javascript:void(\'' + escape(this.func.name) + '\')" value="' + this.label + '">';
}


/**
 * onClick() attaches a handler to an existing node.
 */
function onClickImpl(/*Document*/ doc, 
                     /*Pattern*/ pattern, 
                     /*String or Function*/ handler) {
  var node = patternAsNode(pattern, doc);
  node.addEventListener("click", makeEventHandler(handler), false);  
}


function makeEventHandler(/*String or Function*/ func) {
  if (instanceOf(func, String)) {
    throw new Error("string event handlers not supported yet");
  } else {
    return func;
  }
}

/**
 * Functions that print to the output pane.
 */

// ID attribute of output pane XUL element.  Used by default in the
// functions below; but additional output-like panes (like the Action history)
// can be controlled by specifying the ID of the other pane instead.
const CF_DEBUG_ID = 'CF_DEBUG';

/**
 * Print object to output panes on all open sidebars AND to the
 * Javascript console.
 * Used for internal Chickenfoot debugging or trigger debugging.
 */
function debug(/*anything*/ obj) {  
  try {
    var windowMediator = 
      Components.classes["@mozilla.org/appshell/window-mediator;1"]
        .getService(Components.interfaces.nsIWindowMediator);
    var e = windowMediator.getEnumerator("navigator:browser");
    while (e.hasMoreElements()) {
      var chromeWindow = e.getNext();
      printDebug(chromeWindow, obj);
    }
  } catch (e) {
  }
  
  debugToErrorConsole(obj)
}

/**
 * Print object only to Javascript error console.
 * Use for debugging messages that shouldn't be allowed to clutter the output pane.
 */
function debugToErrorConsole(/*anything*/ obj) {
  var consoleService = Components.classes["@mozilla.org/consoleservice;1"]
                                 .getService(Components.interfaces.nsIConsoleService);
  consoleService.logStringMessage(toDebugString(obj));  
}


// Objects that want to print themselves in a special way in the
// Chickenfoot output pane can define this method:
//    /*anything*/ toChickenfootDebugOutput(/*Node*/ debugEntry);
//        debugEntry    is the element of the Chickenfoot output pane to which this output will be appended.
//  
//    toChickenfootDebugOutput can either:
//       - return an arbitrary string or object that should be displayed in the debug pane.
//         The caller will pass this object to toDebugString() to convert it into a string for display.
//    or:   
//       - directly append child nodes to debugEntry, and return undefined to signal
//         to the caller that it handled the output itself.
//

/**
 * Print object to output pane in given chrome window.
 * Used by Chickenfoot output() command and by evaluate().
 */
function printDebug(/*ChromeWindow*/ chromeWindow, 
                    /*anything*/ obj,
                    /*optional boolean*/ dontBringToFront,
                    /*optional boolean*/ isHTML, 
                    /*optional String*/ id) {
  if (!id) id = CF_DEBUG_ID;

  // find sidebar
  var sidebarWindow = getSidebarWindow(chromeWindow);
  if (!sidebarWindow) return;  
  var sidebar = sidebarWindow.document;
    
  // make sure Output tab is visible
  if (!dontBringToFront) autoswitchToOutputPane(sidebar)
  
  var debug = sidebar.getElementById(id);
  var node = getLatestDebugEntry(sidebar, id);  
  addDebugOutput(node, obj, isHTML, chromeWindow);
  
  var win = debug.contentWindow;  
  win.scrollTo(node.offsetLeft, node.offsetTop + node.offsetHeight);
}

// autoswitchTimeout controls the way Chickenfoot automatically switches to
// the Output pane when a message is printed.  When the mouse is active anywhere
// in the tab box, autoswitching is disabled until no more such mouse events
// have happened for the duration of this timeout.  The timeout is in milliseconds.
const autoswitchTimeout = 5000; // milliseconds

function startOutputPaneAutoswitching(/*SidebarDocument*/ sidebar) {
  if (autoswitchTimeout) {
    var tab = sidebar.getElementById("CF_DEBUG_TAB");
    var tabbox = tab.parentNode.parentNode;
    tabbox.addEventListener("mousedown", mouseActivityInTabs, true)
    tabbox.addEventListener("mousemove", mouseActivityInTabs, true)
  }

  function mouseActivityInTabs(event) {
    // clock time when autoswitching will resume
    sidebar.autoswitchResume = new Date().getTime() + autoswitchTimeout
  }
}

function autoswitchToOutputPane(/*SidebarDocument*/ sidebar) {
  var now = new Date().getTime()
  if (now <= sidebar.autoswitchResume) {
    // don't autoswitch, because it's less than autoswitchTimeout msec since
    // user touched the tabs
    return;
  }

  var tab = sidebar.getElementById("CF_DEBUG_TAB");
  var tabbox = tab.parentNode.parentNode;
  tabbox.selectedTab = tab;
}


//takes string as optional fifth argument, specifying how obj should be printed
// should be used only when differs from how toDebugString(obj) returns.
function addDebugOutput(/*Node*/ node, /*anything*/ obj, /*boolean*/ isHTML, /*chromeWindow*/ chromeWindow, /*optional string*/ title) {
  var sidebarWindow = getSidebarWindow(chromeWindow);
  var doc = node.ownerDocument;
  var objToPrint = obj;
  
  // First see if obj knows how to make itself into debug output. 
  var hasChickenfootDebugOutput = false;
  try { 
    // Catch errors if obj.toChickenfootDebugOutput does not exist.  Some objects throw
    // security exceptions if you even look twice at them!
    // Don't actually call toChickenfootDebugOutput() inside this try-catch, so we can
    // distinguish these access exceptions (which we want to mask) from exceptions thrown
    // by toChickenfootDebugOutput() (which we DON'T want to mask, but propagate upwards so 
    // that the author of that function can debug them).
     
    if (obj && typeof obj == "object" && typeof obj.toChickenfootDebugOutput == "function") {
      hasChickenfootDebugOutput = true;
    }
  } catch (err) {
  }
  
  if (hasChickenfootDebugOutput) {      
    var result = obj.toChickenfootDebugOutput(doc, node);
    if (result === undefined) {
      return;
    } else {
      objToPrint = result;
    }
  }
  
  if (isHTML) {
    var text = toDebugString(objToPrint);
    var range1 = doc.createRange();
    range1.setStart(node, 0);
    range1.setEnd(node, 0);
    node.appendChild(range1.createContextualFragment(text+"<br>"));
    return;
  }
  
  // otherwise just convert obj to text
  if (title) {var newNode = title;}
  else {
    var text = toDebugString(objToPrint);
    var newNode = doc.createTextNode(text + "\n");
  }
  var spaceNode = doc.createTextNode("");
  if (typeof obj == "object") {
    var header; var bodyRow; var icon;
    
    try {
      var oldSpaces = node.getAttribute("spaces"); 
      if (oldSpaces == null) {numSpaces = "";}
      else {var numSpaces = oldSpaces + "1";}
    }
    catch(err) {var numSpaces = "errSpaces";}
    var spaces = numSpaces.length; var spacesString = "";
    for (var h=0; h<spaces; h++) {
      spacesString += "  ";
    }
    var tableNode = 
    makeElement(doc, "div", {}, [
      header = makeElement(doc, "div", {"class":"collapsed", "id":"current"}, [
          doc.createTextNode(spacesString),
          icon = makeElement(doc, "img", { "class":"expandCollapseIcon", "src":"chrome://chickenfoot/skin/expand.gif", "height":9, "width":9 }, []),
          newNode,
      ]),
      bodyRow = makeElement(doc, "div", {"style":"visibility:hidden", "class":"objectProperties", "spaces":numSpaces}, [
      ]),
    ]);
    
    //event listener function to expand and collapse
    function expandOrCollapse(event) {
      var doExpand = header.getAttribute("class") == "collapsed";
      header.setAttribute("class", doExpand ? "expanded" : "collapsed");
      bodyRow.style.visibility = doExpand ? "visible" : "hidden";
      icon.src = doExpand ? "chrome://chickenfoot/skin/collapse.gif" : "chrome://chickenfoot/skin/expand.gif";
      if (doExpand) {
        sidebarWindow.setCursor('wait');
        //check if is a function that shouldn't expand any more
        if (obj.chickenfootFunctionToDisplay) {
          var funcNode = 
            makeElement(doc, "div", {}, [
              colorText(doc, obj.chickenfootFunctionToDisplay, "navy"),
            ]);
          bodyRow.appendChild(funcNode);
        }
        //otherwise list its items
        else {
          var listOutput = [];
          try { listOutput = listImpl(obj, ".*", "expandibleList"); }
          catch (err) {}
          
          if (instanceOf(obj, Match)) {listOutput = getMatchIteration(obj, listOutput);}
          
          var longestString = 0;
          for (var m=0; m<listOutput.length; m++) {
            if (listOutput[m][1] && (listOutput[m][1].length > longestString)) {longestString = listOutput[m][1].length;}
          }
          
          for (var i=0; i<listOutput.length; i++) {
            var current = listOutput[i];
            var property = current[1];
            var value = current[2];
            
            //add the right number of spaces between property and value for visual columns
            var numberOfSpaces = longestString + 5 -(property.length);
            for (var k=0; k<numberOfSpaces; k++) {
              property += " ";
            }
           
            //if item is an object, recursively send it back to addDebugOutput
            if (typeof value == "object" && value !== null) {
              if ((instanceOf(value, Match) && (property.toString().substring(0, 4) != "next"))
                  || instanceOf(obj, Array)) {
                var name = property + " = " + toDebugString(value);
              }
              else {var name = property + toDebugString(value);}
              addDebugOutput(bodyRow, value, isHTML, chromeWindow, colorText(doc, name, "green"));
            }
            //if item is a function, allow it to expand once more
            else if (typeof value == "function") {
                //remove the "\n" characters in the header text
                var name = property + value;
                name = name.replace(/\n/g, "");
                value = spacesString + "    " + value.toString().replace(/\n/g, "\n" + spacesString + "    ");
                
                functionObj = new Object();
                functionObj.chickenfootFunctionToDisplay = value;
                addDebugOutput(bodyRow, functionObj, isHTML, chromeWindow, colorText(doc, name, "navy"));
              }
            else if (instanceOf(obj, Array)) {
              var name = property + " = " + toDebugString(value);
              bodyRow.appendChild(colorText(doc, spacesString + "  " + name + "\n", "purple"));
            }
            //otherwise, don't expand anymore, just print the item and its value
            else {
              var name = property + "  " + value;
              bodyRow.appendChild(colorText(doc, spacesString + "  " + name + "\n", "purple"));
            }
          }
        }
        sidebarWindow.setCursor('auto');
      } else {
        removeAllChildren(bodyRow);
      }
    }  
    
    //event listener function to highlight match objects in html pages
    function highlightMatch() {
      //if no matches, just clear the document
      if (!obj.hasMatch) { 
        try {clearAll(chromeWindow, header); fireMouseEvent("click", chromeWindow.content.wrappedJSObject.document.body); return;}
        catch(err) {return;} 
      }
      //if XUL searching, don't do anything because red highlighting throws an error
      if (instanceOf(obj.document, XULDocument)) {return;}
      //then highlight all or just one, depending on whether they clicked on an expanded match object or not
      var win = obj.document.defaultView;
      if (!obj._toExpand) {
        clearAll(chromeWindow, obj);
        try {selectAll(win, obj);} catch (err) {debug(err)}
        header.style.color = 'red';
        header.title = 'black';
      }
      else {
        clearAll(chromeWindow, obj);
        var matchToSelect = oneMatch(obj);
        try {selectAll(obj.document.defaultView, matchToSelect);} catch (err) {debug(err)}
        header.childNodes[2].style.color = 'red';
        header.title = 'green';
      }
    }
    
    //event listener function to throw away object reference, remove event listeners, and disable entry
    function disableEntry(event) {
      if (this.getAttribute("id") == "toRemove") {
        this.removeEventListener("click", expandOrCollapse, false);
        this.setAttribute("id", "");
        if (instanceOf(obj, Match)) {
          clearAll(chromeWindow, obj);
          this.removeEventListener("click", highlightMatch, false);
          chromeWindow.content.wrappedJSObject.removeEventListener("click", function(event) {clearAll(chromeWindow, obj);}, false);
          this.title = "";
        }
        this.removeEventListener("mouseup", disableEntry, false);
      }
      else { return; }
    }
    
    //add all appropriate event listeners
    header.addEventListener("click", expandOrCollapse, false);
    header.addEventListener("mouseup", disableEntry, false);
    if (instanceOf(obj, Match)) {
      header.addEventListener("click", highlightMatch, false);
      highlightMatch(); // highlight all the matches now
      chromeWindow.content.wrappedJSObject.addEventListener("click", function(event) {clearAll(chromeWindow, obj);}, false);
    }
    newNode = tableNode;
  }
  node.appendChild(newNode);
}

//clears all highlighted match entries (in debug pane and html document)
function clearAll(chromeWindow, obj) {
  try {clearSelection(obj.document.defaultView);}
  catch(err) {}
  var sidebarWindow = getSidebarWindow(chromeWindow);
  var sidebar = sidebarWindow.document;
  var recentEntry = getLatestDebugEntry(sidebar, CF_DEBUG_ID);
  var treewalker = createDeepTreeWalker(recentEntry, NodeFilter.SHOW_All);
  var current = treewalker.nextNode();
  while (current) {
    if (current.title == "black") {current.style.color = "black";}
    if (current.title == "green") {current.childNodes[2].style.color = "green";}
    current = treewalker.nextNode();
  }
}

function makeElement(/*Document*/ doc, /*String*/ name, /*Object*/ attrs, /*Node[]*/ children) {
  var node = doc.createElement(name);
  for (var attr in attrs) {
    node.setAttribute(attr, attrs[attr]);
  }
  for (var i = 0; i < children.length; ++i) {
    node.appendChild(children[i]);
  }
  return node;
}

function removeAllChildren(/*Node*/ node) {
  for (var i = node.childNodes.length-1; i >= 0; --i) {
    node.removeChild(node.childNodes[i]);
  }
}

/**
 * Gray out all previous output entries and prepare to receive fresh output.
 * If id is provided, changes the output pane with the given id attribute;
 * otherwise defaults to CF_DEBUG_ID.
 */
function startNewDebug(/*ChromeWindow*/ chromeWindow, 
                       /*optional String*/ id) {
  if (!id) id = CF_DEBUG_ID;

  // find sidebar
  var sidebarWindow = getSidebarWindow(chromeWindow);
  if (!sidebarWindow) return;  
  var sidebar = sidebarWindow.document;

  var debug = sidebar.getElementById(id);
  var doc = debug.contentDocument;
  var body = doc.getElementsByTagName('body')[0];
  
  var div = getLatestDebugEntry(sidebar, id);
  if (div.hasChildNodes()) {
    // need to create a new PRE
    div.setAttribute("class", "old");
    disablePrevious(div);
    
    var newDiv = doc.createElement('PRE');
    newDiv.setAttribute("class", "new");
    body.appendChild(newDiv);
    div = body.lastChild;
  }
  
  var win = debug.contentWindow;  
  win.scrollTo(div.offsetLeft, div.offsetTop + div.offsetHeight);
}

function disablePrevious(/*node*/ node) {
  var pred = 
    function (node) { 
      try{return (node.id == "current");}
      catch(err) {return false;} 
    };
  var treewalker = createDeepTreeWalker(node, NodeFilter.SHOW_ALL, pred);
  var current = treewalker.nextNode();
  while (current) {
    current.id = "toRemove";
    fireMouseEvent("mouseup", current);
    current = treewalker.nextNode()
  }
}

/**
 * Clears the output pane in sidebar.
 * If id is provided, clears the output pane with the given id attribute;
 * otherwise defaults to CF_DEBUG_ID.
 */
function clearDebugPane(/*ChromeWindow*/ chromeWindow, /*optional String*/ id) {
  // find sidebar
  var sidebarWindow = getSidebarWindow(chromeWindow);
  if (!sidebarWindow) return;  
  var sidebar = sidebarWindow.document;

  if (!id) id = CF_DEBUG_ID;
  var debug = sidebar.getElementById(id);
  var doc = debug.contentDocument;
  var body = doc.getElementsByTagName('body')[0];
  var parent = body.parentNode;
  parent.removeChild(body);
  
  var newBody = doc.createElement('BODY');  
  parent.appendChild(newBody);
  getLatestDebugEntry(sidebar, id);
}

/**
 * Render an object or exception as a string for display to
 * the output pane.  Returns the string.
 */
function toDebugString(/*any*/ obj) {
  if (obj === null) {
    return 'null';
  }
  
  if (obj === undefined) {
    return 'undefined';
  }
  
  if (Range && instanceOf(obj, Range)) {
    return '[object Range]';
  } 
  
  if (((typeof obj) == "object") && (obj.toString().match(/^java\./)) && hasJava()) {
    try { // catch errors if java isn't initialized yet
      if (instanceOf(obj, java.security.PrivilegedActionException)) {
        return toDebugString(obj.getException());
      } else if (instanceOf(obj, java.lang.reflect.InvocationTargetException)) {
        return toDebugString(obj.getCause());
      } else if (instanceOf(obj, java.lang.Throwable)) {
        var text = obj.toString();
        var stack = obj.getStackTrace();
        if (stack.length >= 1) {
          text += "\n in " + stack[0];
          for (var i = 1; i < stack.length; ++i) {
            var frame = stack[i].toString();
            if (frame.match(/^sun.reflect|java.lang.reflect/)) {
              break;
            } else {
              text += "\n    " + frame;
            }
          }
        }
        return text;
      }
    } catch (e) {
    }
  }
  
  try {
    if (instanceOf(obj, Error) 
          /* FIX: the catalog of errors below is required because our instanceOf() doesn't
             handle subtyping. If user creates their own subclass of Error, we won't detect it
             here, which is bad. */
        || instanceOf(obj, SyntaxError) 
        || instanceOf(obj, ReferenceError)
        || instanceOf(obj, TypeError)
        || instanceOf(obj, EvalError)
        || instanceOf(obj, RangeError)
        || instanceOf(obj, URIError)
        ) {
      return obj.toString() + '\n' + translateJavascriptStackTrace(obj.stack);
    }
    
    return obj.toString();
  } catch (error) {
    // Firefox 1.0.3 workaround:
    //   if obj is an array containing objects from the browser document,
    //   it throws "Illegal operation on WrappedNative prototype object"  nsresult: "0x8057000c (NS_ERROR_XPC_BAD_OP_ON_WN_PROTO)"
    // Deal with it by displaying the array directly.
    if (instanceOf(obj, Array)) {
      if (obj.length == 0) return "";
      var s = obj[0].toString();
      for (var i = 1; i < obj.length; ++i) {
        s += "," + obj[i].toString();
      }
      return s;
    } else {
      // exception was caused by something else;
      // pass it on
      throw error;
    }
  }
  
  /**
   * Parse the stack trace and return something
   * more human-readable.
   */
  function translateJavascriptStackTrace(/*String*/ stack) {
    var re = /(\w*)(\(.*\))@(.*):(\d+)/g;
    re.lastIndex = 0;
    
    var sb = new StringBuffer();
    while (m = re.exec(stack)) {
      var functionName = m[1];
      var args = m[2];
      var file = m[3];
      var line = m[4];

      if (file == "chrome://chickenfoot/content/chickenscratch.xul") {
        line -= 16;
      }
      
      if (functionName == "Error" || functionName == "Exception") {
        continue;
      }
      
      if (!functionName) functionName = "anonymous";

      sb.append((sb.length == 0) ? " in " : "    ");      

      // the first chickenscratchEvaluate should be the top of the stack
      if (functionName == "chickenscratchEvaluate") {
        sb.append("top level line " + line + "\n");
        break;
      } else {
        sb.append(functionName + "() line " + line + "\n");
      }
    }
    return sb.toString();
  }
  
} // end toDebugString()

/**
 * Get the node representing the latest output entry, to which new text nodes
 * can be added as children.
 * If id is provided, changes the output pane with the given id attribute;
 * otherwise defaults to CF_DEBUG_ID.
 */
function getLatestDebugEntry(/*XULDocument*/ sidebar, /*optional String*/ id) {
  if (!id) id = CF_DEBUG_ID; 
  var debug = sidebar.getElementById(id);
  var doc = debug.contentDocument;
  var body = doc.getElementsByTagName('body')[0];
  var div = body.lastChild;
  
  if (div == null || div.tagName != 'PRE') {
    // need to create a PRE element
    var newDiv = doc.createElement('PRE');
    newDiv.setAttribute("class", "new");
    body.appendChild(newDiv);
    div = body.lastChild;
  }
  
  return div;
}

function colorText(/*HTMLDocument*/ doc, /*string*/ text, /*string*/ color) {
  var textnode = doc.createTextNode(text);
  var font = doc.createElement("font");
  font.style.color = color;
  font.appendChild(textnode);  
  return font;
}

function getMatchIteration(/*Match object*/ matchObj, /*Array*/ listOutput) {
  if ((matchObj == EMPTY_MATCH) || (matchObj._next == EMPTY_MATCH) || (matchObj._toExpand)) { 
    return listOutput; 
  }
  else {
    var matchIteration = new Array();
    var firstMatchCopy = oneMatch(matchObj);
    matchIteration.push(firstMatchCopy);
    firstMatchCopy._toExpand = true;
    matchObj = matchObj.next;
    
    while (matchObj != EMPTY_MATCH) {
      matchIteration.push(matchObj);
      matchObj._toExpand = true;
      matchObj = matchObj.next;
    }
    return listImpl(matchIteration, ".*", "expandibleList");
  }
}


/**
 * Finds the text input that is most closely linked
 * to 'pattern' and sets the value of the input to 'value'
 */
function enterImpl(/*Document*/ doc, /*string*/pattern, /*string*/value, /*optional Match*/ context, /*optional function*/ feedbackHandler) {
  if (value === undefined) {
    value = pattern;
    pattern = null;
  }
  var m = Pattern.find(doc, pattern, [Pattern.TEXTBOX], context);

  // make sure exactly one best match
  if (m.count == 0) {
    throw addMatchToError(new Error("No match for enter(" + pattern + ")"), m);
  } else if (m.count > 1) {
    throw addMatchToError(new Error("More than one best match for enter(" + pattern + ")"), m);
  }
  
  // use the one best match
  var node = m.element;
  
  if (feedbackHandler) feedbackHandler(node, doEnter);
  else doEnter();
  
  function doEnter() {
      if ("value" in node) {
        node.value = value}
        //this works on wrapped xul objects and some anonymous nodes
        else if ("value" in node.wrappedJSObject) {
               node.wrappedJSObject.value = value}
             else {
               throw addMatchToError(new Error("Don't know how to enter text into " + node), m);
          }
      
      // simulate events to trigger Javascript handlers on this node
      fireEvent('change', node);
  }
}


/**
 * CF_GO_REGEXP is a regexp that tries to match a valid URI
 * 
 * When a string is successfully matched against CF_GO_REGEXP,
 * it returns an array with the following elements:
 *
 * 0:  the original string
 * 1:  "http", "https", "ftp", "file", "chrome", "about", "moz-icon", or null
 * 2:  "://" if it exists, null otherwise
 * 3:  "www." if it exists, null otherewise
 * 4+: other possibly null strings -- this part of the spec may change,
 *     so do not rely on it
 */
const CF_GO_REGEXP = new RegExp(
  '^(https?|ftp|file|chrome|about|moz-icon)?(:\/\/)?(www\.)?(.*)'
);

/**
 * Tries to go to the provided url in the given window
 *
 * @param win window to load URL in
 * @param url the URL to go to
 * @param reload OPTIONAL force go() to refresh
 *   the page if document.location == url
 */
function goImpl(/*Window*/ win, /*String*/ url, /*Boolean*/reload) {
  if (url == null) return;
  url = url.toString(); // since it may be passed a document.location
  // do not follow javascript: links
  if (url.match(/^javascript:/)) return;
  var matches = url.match(CF_GO_REGEXP);
  if (matches && matches[1] == null) url = "http://" + url;
  if (!reload && win.location == url) return;
  win.location = url;
}

/** Test code for RegExp:
var arr = new Array();
re = new RegExp(
'^(https?|ftp|file|chrome|about|moz-icon)?(:\/\/)?(www\.)?(.*)'
);

arr.push( 'file:///c:/eclipse/workspace/chickenfoot/build/download.html' );
arr.push( 'http://yahoo.com' );
arr.push( 'https://www.yahoo.com/' );
arr.push( 'ftp://mozilla.org/' );
arr.push( 'www.bolinfest.com' );
arr.push( 'google.com' );
arr.push( 'about:blank' );
arr.push( 'chrome://googledominoes/content/search.html?q=search' );

for (var i = 0; i < arr.length; i++) {
  m = arr[i].match(re);
  debug(m[1]);
}
*/
/**
 * include() evaluates a script file.
 *
 * @param href {string} Filename or URL to load.  Examples:
 *   "GoogleSearch.js"
 *   "dir/file.js"
 *   "c:\\Documents and Settings...\\file.js"
 *   "file:///c:/Documents and Settings.../file.js"
 *   "chrome://chickenfoot/..."
 *   "http://uid.csail.mit.edu/..."
 *
 * Relative files like "GoogleSearch.js" or "dir/file.js" are searched for in the
 * following locations, in order:
 *    1. the libraries built into Chickenfoot, such as fileio.js
 *    2. the directory containing the including script (the sourceDir parameter)
 *    3. the chickenfoot/ directory in the Firefox profile directory (which
 *       is where trigger scripts are stored)
 *    4. any directories listed in the chickenfoot.include_directories preference
 *       (separated by semicolons)
 *
 * Note that absolute filenames use the native path separators (backslash on Windows,
 * slash on other platforms)
 *
 * @param evaluationContext  Chickenscratch evaluation context of including script.
 *
 * @param optional namespace {string|object} The namespace in which top-level vars
 * and functions in the file will be defined.  There are a few options for this argument:
 * <ul>
 *  <li>If unspecified, then the Chickenscratch evaluation context will be used.
 *  <li>If a string, a new object with that name will be created in the Chickenscratch
 *    evaluation context and the file's top-level vars and functions will become 
 *    properties of that new object. If there is already an object with that name in 
 *    the Chickenscratch context, then it will be replaced.
 *  <li>If an object, then the file's top-level vars and functions will be defined as a
 *    property of that object.
 * </ul>
 * Warning: variables that are never declared with var will *always* end up in
 * the global environment, regardless of the namespace argument.  For example, if
 * file contains the code below:
 *         var x = 5;
 *         y = 6;
 * then x will be placed in the namespace object, but y will be placed in the global
 * environment.
 */
function includeImpl(/*string*/ fileName,
                 /*object*/ evaluationContext,
                 /*optional string|object*/ namespace) {

  // load script(s) specified by fileName
  var scripts = loadScripts(fileName);
  
  // create or use the scope specified by namespace 
  var scope = getScope(namespace);
  
  // evaluate the scripts in the scope and return the result
  return evaluateScripts(scripts, scope);
  
  //
  // The rest of this method consists of helper functions.
  //
  
  // A Script represents a script loaded from a file or URL.
  function Script(/*string*/ text, /*nsIFile*/ dir, /*nsIURL*/ url) {
    this.text = text;       //(string) content of the script
    this.scriptDir = dir;  //(nsIFile) the folder containing the script, or null if script is a URL
    this.scriptURL  = url; //(nsIURL) the URL of the script's folder
  }

  function loadScripts(/*String or nsIFile */fileName) /*returns Script[]*/ {
    // try nsIFile
    if (instanceOf(fileName, Components.interfaces.nsIFile)) {
      return [new Script(SimpleIO.read(fileName), fileName.parent, null)];
    }
    
    // try absolute URL
    if (fileName.match(/^(chrome|file|https?):\//)) {
      return [new Script(SimpleIO.read(fileName), null, makeURL(directoryOf(fileName)))];
    }

    // try absolute filename
    try {
      var file = Components.classes["@mozilla.org/file/local;1"].
    	    createInstance(Components.interfaces.nsILocalFile);
      file.initWithPath(fileName);
      return loadScripts(file);
    } catch (e) {
      //debug(e)
      //debug(fileName + " is not an absolute pathname");
    }

    // try the libraries that are bundled with Chickenfoot
    try {
      return loadScripts("chrome://chickenfoot/content/libraries/" + fileName);
    } catch (e) {
      //debug(e)
      //debug(fileName + " is not a builtin library");
    }
    
    // for exported packages, try the package's top-level folder
    if(isExportedXpi) {
      try {
        return loadScripts("chrome://chickenfoot/content/" + fileName);
      } catch (e) {
        //debug(e)
        //debug(fileName + " is not a packaged extension file");
      }
    }

    // try the directory of the including script
    if (evaluationContext.scriptDir) {
        try {
            return loadScripts(SimpleIO.toFile(fileName, evaluationContext.scriptDir));
        } catch (e) {
          //debug(e)
          //debug(fileName + " is not in  " + evaluationContext.scriptDir.path);
        }
    }
        
    // try the URL of the including script
    if (evaluationContext.scriptURL) {
        try {
            return loadScripts(evaluationContext.scriptURL.asciiSpec + "/" + fileName);
        } catch (e) {
          //debug(e)
          //debug(fileName + " is not in " + evaluationContext.scriptURL);
        }
    }
        
    // try Chickenfoot profile dir
    try {
        return loadScripts(SimpleIO.toFile(fileName, TriggerManager._getChickenfootProfileDirectory()));
    } catch (e) {
      //debug(e)
      //debug(fileName + " is not in chickenfoot/ dir");
    }
    
    // try folders on the include path
    var includePath = getIncludeDirectories();
    for (var i = 0; i < includePath.length; ++i) {
        try {
            return loadScripts(SimpleIO.toFile(fileName, includePath[i]));
        } catch (e) {
          //debug(e)
          //debug(fileName + " is not in " + includePath[i].path);
        }
    }

    // give up
    throw new Error("include: can't find " + fileName);
  }  
  
  function getScope(/*optional string | object*/ namespace) /* returns scope object*/ {
      if (!namespace) {
        return evaluationContext;
      }
      
      var scope;
      if (typeof namespace === 'string' 
          || instanceOf(namespace, String)) {
        scope = {};
        evaluationContext[namespace.toString()] = scope;
      } else if (typeof namespace == 'object') {
        scope = namespace;
      } else {
        throw new Error("second argument of include() should be a string or an object");
      }
      
      // initialize the scope with Chickenscratch identifiers
      return getEvaluationContext(
            scope, 
            evaluationContext.chromeWindow, 
            evaluationContext.window, 
            evaluationContext.chickenscratchEvaluate
      );
  }

  function evaluateScripts(/*Script[]*/scripts, /*object*/ scope) /* returns any object*/ {
      // Evaluate the code in the namespace.
      if (scope == evaluationContext) {
        // need to save and restore the scriptDir and scriptURL variables if the
        // included code shares the same context as the including code
        var originalDir = scope.scriptDir;
        var originalURL = scope.scriptURL;
      }    
      try {
        var retval;
        for (var i = 0; i < scripts.length; ++i) {
          var script = scripts[i];
          scope.scriptDir = script.scriptDir;
          scope.scriptURL = script.scriptURL; 
          retval = evaluationContext.chickenscratchEvaluate(scope, script.text);
        }
        return retval;
      } finally {     
        if (scope == evaluationContext) {
          // restore the script-specific variables
          scope.scriptDir = originalDir;
          scope.scriptURL = originalURL;
        }
      }
  }

  function makeURL(/*string*/ href) {
    var url = Components.classes["@mozilla.org/network/standard-url;1"].createInstance(Components.interfaces.nsIURI);
    url.spec = href;
    return url;
  }
  
  // Removes the last path entry from a URL string, turning e.g.
  // http://www.foo.com/bar.js into http://www.foo.com
  // Requires: href has a nonempty file path part
  function directoryOf(/*string*/ href) {
    return href.substring(0, href.lastIndexOf('/'));
  }

  function getIncludeDirectories() { 
    // name of preference that contains the user-directories
    var key = 'include_directories';
    // preference branch that contains the Chickenfoot prefs
    var branch = Components.classes['@mozilla.org/preferences-service;1'].
                            getService(Components.interfaces.nsIPrefService).
                            getBranch('chickenfoot.');
    if (!branch.prefHasUserValue(key)) return [];
    var path = branch.getCharPref(key);
    var dirNames = path.split(';');
    var dirs = [];
    for (var i = 0; i < dirNames.length; ++i) {
      dirs.push(SimpleIO.toFile(dirNames));
    }
    return dirs;
  }
    
}

goog.require('goog.structs.Map');

/**
 * Insert, remove, replace
 */

/**
 * Deletes the first instance of pattern
 * from the current web page.
 * Returns the contents of the pattern as it's return value
 * Returns null if you try to remove a pattern that does not exist on the page
 */
function removeImpl(/*HtmlDocument*/ doc, /*Pattern*/ pattern) {
  var range = patternAsRange(pattern, doc);
  if (!range) return null;
  var rangeContents = range.extractContents();
  range.deleteContents();
  Test.assertTrue(range.collapsed, "range must be collapsed to be a Position")
  return rangeContents;
}

/**
* Special form of remove that is called internally be replace.
* Deletes the first instance of pattern
* from the current web page.
* Returns the range (which is a position) of the pattern's starting point. 
* Returns null if the pattern was not found.
**/
function removeImplForReplace(/*HtmlDocument*/ doc, /*Pattern*/ pattern) {
  var range = patternAsRange(pattern, doc);
  if (!range) return null;
  range.deleteContents();
  Test.assertTrue(range.collapsed, "range must be collapsed to be a Position");
  return range;
}


/**
 * Replaces the first occurrence of a pattern with a different chunk of HTML.
 * Returns the inserted chunk.
 * Returns null if the pattern was not found.
 */
function replaceImpl(/*HtmlDocument*/ doc, /*Pattern*/ pattern, /*Chunk*/ replacement) {
  var range = removeImplForReplace(doc, pattern);
  if (!range) return null;
  return insertImpl(doc, range, replacement);
}

//ranges created around anonymous nodes cannot create a new node that
//is visible to the DOM using createContextualFragment.
//so, work around this by first inserting the chunk before the parentBinding
//then replacing the anonymous node with this already formed node
function insertForAnonNodes(/*document*/ doc, /*Range*/ range, /*Chunk*/ newText) {
  if (doc.getBindingParent(range.startContainer)) {
    nearestRealNode = doc.getBindingParent(range.startContainer) }
  else {nearestRealNode = range.startContainer}
  var tempPosition = beforeImpl(doc, nearestRealNode);
  insertImpl(doc, tempPosition, newText);
  //find the temporary node by iterating through a deepTreeWalker
  //until the currentNode.nextSibling is the parentBinding
  var treeWalker = Chickenfoot.createDeepTreeWalker(doc, NodeFilter.SHOW_ALL);
  var nodeToInsert = treeWalker.currentNode; 
  while (!(nodeToInsert.nextSibling && nodeToInsert.nextSibling == nearestRealNode)) {
    nodeToInsert = treeWalker.nextNode(); }    
  return replaceImpl(doc, range, nodeToInsert);}

/**
 * @param position a Pattern that indicates where the insertion occurs
 * @param newText a Chunk that should be inserted
 * @return the Node version of the Chunk that was inserted
 */
function insertImpl(/*HtmlDocument*/ doc, /*Pattern*/ position, /*Chunk*/ newText) {
  var range = patternAsRange(position, doc);
  if (!range.collapsed) throw Error("position does not identify a point in the document")

  // since range is collapsed, does not matter if we use start or end
  var container = range.startContainer;
  var offset = range.startOffset;

  var startRanges = (container.startRanges) ? container.startRanges : [];
  var endRanges = (container.endRanges) ? container.endRanges : [];
  
  var newNode = chunkAsNode(newText, range);
  if (newNode == 'anonymous content') {
    return insertForAnonNodes(doc, range, newText);
  }

  if (container.nodeType == Node.TEXT_NODE) {
    // record ranges whose start offset will need to be updated
    var range2startOffset = new goog.structs.Map/*<Range,int>*/();
    for (var i = 0; i < startRanges.length; i++) {    
      var r = startRanges[i];
      if (r.startOffset > offset) {
        range2startOffset.set(r, r.startOffset);
        startRanges.splice(i--, 1);
      }
    }
    // record ranges whose end offset will need to be updated    
    var range2endOffset = new goog.structs.Map/*<Range,int>*/();
    for (var i = 0; i < endRanges.length; i++) {
      var r = endRanges[i];
      if (r.endOffset > offset) {
        range2endOffset.set(r, r.endOffset);
        endRanges.splice(i--, 1);
      }
    }

    // save nextSibling for the insertion
    var newTextNode = container.nextSibling;

    // do the insertion
    range.insertNode(newNode);
    
    // if had nextSibling, the newTextNode is the now the previousSibling of that node
    // if no nextSibling, then newTextNode is last child of parentNode
    newTextNode = (newTextNode)
      ? newTextNode.previousSibling
      : container.parentNode.childNodes.item(
          container.parentNode.childNodes.length - 1
        );
    
    // FIX UP RANGES

    // extend ends of ranges before starts 
    var endEntries = range2endOffset.getEntries();
    newTextNode.endRanges = (newTextNode.endRanges) ? newTextNode.endRanges : [];
    for (var i = 0; i < endEntries.length; i++) {
      var r = endEntries[i].key;
      var diff = endEntries[i].value - container.nodeValue.length;      
      r.setEnd(newTextNode, diff);
      newTextNode.endRanges.push(r);
    }
    range2endOffset.clear();

    var startEntries = range2startOffset.getEntries();
    newTextNode.startRanges = (newTextNode.startRanges) ? newTextNode.startRanges : [];
    for (var i = 0; i < startEntries.length; i++) {
      var r = startEntries[i].key;
      var diff = startEntries[i].value - container.nodeValue.length;      
      r.setStart(newTextNode, diff);
      newTextNode.startRanges.push(r);
    }
    range2startOffset.clear();

  } else { // presumably element node
    // record ranges whose start offset will need to be updated
    var range2diff = new goog.structs.Map/*<Range,int>*/();
    for (var i = 0; i < startRanges.length; i++) {
      var r = startRanges[i];
      if (r.startOffset == range.startOffset) {
        range2diff.set(r, r.endOffset);        
      }
    }
    // do the insertion
    range.insertNode(newNode);
    // FIX UP RANGES
    var entries = range2diff.getEntries();
    for (var i = 0; i < entries.length; i++) {
      var r = entries[i].key;
      var diff = r.endOffset - entries[i].value;
      r.setStart(container, diff);
    }
    range2diff.clear();
  }
  
 // FIX: should return a Match here,
 // but simply calling nodeToMatch() breaks because
 // of bug #128.
 return newNode;
}

/**
 * Changes a document so that all ranges created from it
 * are memoized, so that insert() can fix them up properly.
 */
function recordCreatedRanges(/*HtmlDocument*/ doc) {
/*
  TODO restore this once insert.js code is ready to actually use these
  ranges
  
  if ("_MozillaDocumentCreateRange" in doc) return doc; // already instrumented
  
  doc._MozillaDocumentCreateRange = doc.createRange;
  doc.ranges = new SlickSet();  
  doc.createRange = function() {
    var range = this._MozillaDocumentCreateRange();      
    this.ranges.add(range);
    
    // TODO add listeners and whatnot
    return range;
  };
*/
}

/**
 * Takes a pattern and returns a Range
 * that represents the point just before it.
 * The range returned will be collapsed.
 */
function beforeImpl(/*HtmlDocument*/ doc, pattern) {
  var range = patternAsRange(pattern, doc);
  range = range.cloneRange();
  range.collapse(true);
  return range;
}

/**
 * Takes a pattern and returns a Range
 * that represents the point just after it
 * The range returned will be collapsed.
 */
function afterImpl(/*HtmlDocument*/ doc, pattern) {
  var range = patternAsRange(pattern, doc);
  range = range.cloneRange();
  range.collapse(false);
  return range;
}

/**
 * A pattern is:
 * (1) Match
 * (2) Node
 * (3) Range
 * (4) Keyword string
 * (5) Link
 * (6) Button
 *
 * patternAsRange may return null 
 */
function patternAsRange(pattern, doc) {
  if (!pattern) throw Error("null argument passed to patternAsRange");
  if (instanceOf(pattern, DocumentFragment)) {
    var doc = pattern.ownerDocument;
    var range = doc.createRange();
    range.setStart(pattern.firstChild.parentNode, getChildIndex(pattern.firstChild));
    range.setEnd(pattern.lastChild.parentNode, getChildIndex(pattern.lastChild) + 1);
    return range;
  } else if (instanceOf(pattern, Node)) {
    return nodeToRange(pattern);
  } else if (instanceOf(pattern, Link) || instanceOf(pattern, Button)) {
    throw new Error("pattern as LinkOrButton is not supported yet");
  } else if (instanceOf(pattern, Range)) {
    return pattern;
  } else if (instanceOf(pattern, Match)) {
    // TODO handle case where Match.range is null
    return pattern.range;
  } else {
    var mozMatch = Pattern.find(doc, pattern);
    if (!mozMatch) return null;
    // TODO handle case where Match.range is null
    return mozMatch.range;
  }
}

/**
 * A pattern is:
 * (1) Match
 * (2) Node
 * (3) Range
 * (4) Keyword string
 * (5) Link
 * (6) Button
 *
 * patternAsNode may return null 
 */
function patternAsNode(pattern, doc) {
  if (!pattern) throw Error("null argument passed to patternAsNode");
  if (instanceOf(pattern, DocumentFragment)) {
    return pattern;
  } else if (instanceOf(pattern, Node)) {
    return pattern;
  } else if (instanceOf(pattern, Link) || instanceOf(pattern, Button)) {
    throw new Error("pattern as LinkOrButton is not supported yet");
  } else if (instanceOf(pattern, Range)) {
    throw new Error("pattern as Range not supported yet"); 
  } else if (instanceOf(pattern, Match)) {
    // TODO handle case where Match.range is null
    return pattern.element;
  } else {
    var match = Pattern.find(doc, pattern);
    return match.element;
  }
}

/**
 * A chunk is:
 * (1) Match
 * (2) Node
 * (3) Range
 * (4) DocumentFragment
 * (5) Link, Button, or any class that implements a method toNode(Range)
 * (6) String
 *
 * The range parameter should correspond to where the returned node
 * will be inserted in the document, so that chunkAsNode can create
 * a ndoe appropriate to the context..
 */
function chunkAsNode(chunk, range) {
  if (!chunk) throw Error("null argument passed to chunkAsNode()");
  
  if (typeof chunk == "object") {
    if (instanceOf(chunk, Match)) {
      // TODO handle case where Match.range is null
      // return chunk.range.cloneContents();
      return chunk.content;
    } else if (instanceOf(chunk, Node)) { // includes DocumentFragment
      return chunk;
    } else if (instanceOf(chunk, Range)) {
      return chunk.cloneContents();
    } else if ("toNode" in chunk) {
      // provided by, e.g. Button and Link
      return chunk.toNode(range);
    }
  }

  // otherwise, treat it as a string
  try {
    return range.createContextualFragment(chunk.toString()); }
  catch(err) {
    return 'anonymous content' }
}
//include('events.js')

//onKeypressImpl(document, "control enter", function() { click("Feeling Lucky"); 
//})

//Keypress Event
//Example: keypress("control d"), will bring up window to add a bookmark
//         keypress("h e l l o", "first textbox") will write hello into the first textbox on the page
//Clicks the keys given in the first argument, which is a string.
//The focus of the keypress can be set with an optional second argument, a string that
//describes the location that the keypress should be focused on.
function keypressImpl(/*document*/ document, /*string*/ keySequence, /*Optional string*/ destination) { 
    var doc = document;
    var focusNode = null;
    if(destination && destination != doc){
        focusNode = Pattern.find(doc, destination);
        if(focusNode == "no matches"){
            Chickenfoot.debug("Could not find specified focus location");
            return;
        }
        focusNode = getKeypressNode(focusNode);
    }
    else{
        focusNode = doc.documentElement;
    }
    var keys = keySequence;
    keys = parseKeys(keySequence);
    fireKeyEvent(doc, keys, focusNode, true);
}


/**
 * onKeypress() attaches a handler to an existing node.
 * The handler function is performed once the specified key (or combination of keys) has been pressed
 */

function onKeypressImpl(/*document*/ document, /*string*/ keySequence, /*function*/ handler, /*Optional string*/ destination) { 
    var doc = document;
    var focusNode = null;
    if(destination){
         focusNode = Pattern.find(document, destination);
         if(focusNode == "no matches"){
             Chickenfoot.debug("Could not find specified focus location");
             return;
         }
         focusNode = getKeypressNode(focusNode);
        }
    else{
       focusNode = doc.documentElement;
    }
    var keys = parseKeys(keySequence);
    var keyCodes = fireKeyEvent(doc, keys, focusNode, false);
    focusNode.addEventListener("keypress", makeEventHandler, false);
    
             
    function makeEventHandler (evt) {
        var eventCode = [];
        eventCode[0] = evt.ctrlKey;
        eventCode[1] = evt.altKey;
        eventCode[2] = evt.shiftKey;
        eventCode[3] = evt.metaKey;
        eventCode[4] = evt.keyCode;
        eventCode[5] = evt.charCode;
        if(compareArrays(eventCode, keyCodes[0])){
            return handler();
        }
    }
}

//Parses the argument string into an array of strings
function parseKeys(/*string*/ keys) {
    var keyArray = new Array(keys);
    return keyArray[0].split(" ");
}



//Compares the contents of two arrays to see if they are identical
function compareArrays(array1, array2){
    var equalArrays = true;
    if(array1.length == array2.length){
        for(var i=0; i<array1.length; i++){
            if(array1[i] != array2[i]){
                return false;
            }
        }
        return true;
    }
    else{
        return false
    }
}

function getKeypressNode(node) {
  node = node.element;
  if (node.wrappedJSObject) {node = node.wrappedJSObject;}
        
  //if is a xul textbox, drill down to the html input element
  if (instanceOf(node.ownerDocument, XULDocument)
    && isTextbox(node)) {
    var pred = function(n) {return (n && n.nodeName && (n.nodeName == "html:input"));}
    var treewalker = createDeepTreeWalker(node, NodeFilter.SHOW_ALL, pred);
    var txtbox = treewalker.nextNode();
    if (txtbox) {node = txtbox;}
  }
  return node;
}
/**
 * Enumerate the properties of an object into string form.
 * @param obj Object to enumerate
 * @param opt_regexp optional regular expression.  If provided,
 *                   only property names matching the expression
 *                   are displayed.
 * @param opt_expandibleList optional string. If "expandibleList", the buffer returned
                     contains a set of arrays, each with two elements:
                     the object being listed, and one of its properties.
                     If "count", returns number of properties object has.
                     Used by addDebugOutput for expandable object browser
                     in output pane.
 * @return string containing one line for each property,
 *  roughly of the form "name = value".
 * @return (only if opt_expandibleList == true) returns a buffer containing
                     a set of two-element arrays.
 */
function listImpl(obj, opt_regexp, opt_expandibleList) {
  if (!obj && ((typeof obj != 'object') || obj === null)) {
    // this is a cast, not a constructor
    return String(obj);
  }
  var props = [];
  if (instanceOf(obj, Array)) {
    var len = obj.length;
    for (var i = 0; i < len; ++i) props.push(i);
  } else {
    try {var len = 0;
         for (var property in obj) {
           props.push(property);
           ++len;
           if (len > 1000) break;
         }
         if (props.length == 0) {
           if (obj.wrappedJSObject) {
             props.length == 0;
             if (opt_expandibleList && (opt_expandibleList == "count")) {return 1;}
           }
           else {return obj.toString();}
         }
         if (opt_expandibleList && (opt_expandibleList == "count")) {return len;}
         props.sort(String.localeCompare);
    }
    catch (err) {};
  }
  var buffer = [];
  var value, line;
  for (var i = 0; i < props.length; ++i) {
    var property = props[i];
    if (opt_regexp && property.match && !property.match(opt_regexp)) continue;
    try {      
      value = obj[property];
    } catch (e) {
      value = "***ERROR WHEN READING PROPERTY***";
    }
    if (opt_expandibleList && (opt_expandibleList == "expandibleList")) {buffer.push([obj, property, value]);}
    else {
      line = property + ' = ' + value;
      line = line.replace(/\n/g, "");
      buffer.push(line + '\n');
      }
  }
  //include wrappedJSObject property
  if (opt_expandibleList && (opt_expandibleList == "expandibleList") && obj.wrappedJSObject) {
    buffer.push([obj, "wrappedJSObject", obj.wrappedJSObject])}
  
  if (opt_expandibleList && (opt_expandibleList == "expandibleList") && (instanceOf(obj, Match))) {
    buffer.push([obj, "count", obj.count]);
    buffer.push([obj, "document", obj.document]);
    buffer.push([obj, "element", obj.element]);
    buffer.push([obj, "hasMatch", obj.hasMatch]);
    buffer.push([obj, "html", obj.html]);
    buffer.push([obj, "index", obj.index]);
    buffer.push([obj, "range", obj.range]);
    buffer.push([obj, "text", obj.text]);
  }

  if (opt_expandibleList && (opt_expandibleList == "expandibleList")) {
    if (instanceOf(obj, Array)) {
      return buffer; // don't regroup an array
    } else {
      return groupPropertiesAndMethods(buffer);
    }
  }
  else {
    return buffer.join("");
  }
}

function groupPropertiesAndMethods (/*array*/items) {
  properties = new Array();
  methods = new Array();
  objects = new Array();
  for (var i=0; i<items.length; i++) {
    current = items[i];
    value = current[2];
      if (typeof value == "function") {methods.push(current);}
      else if (typeof value == "object") {objects.push(current);}
      else {properties.push(current);}
  }
  var joined = properties.concat(objects).concat(methods);
  return joined;
}



/**
 * Makes a selection from a listbox, dropdown, set of radio buttons,
 * or checkbox.
 * Three arguments are bound up into a list (for the convenience of pick()):
 *    listPattern describes the listbox.  It can be omitted if choicePattern is found in 
 *           only one listbox on the page, or if choicePattern describes a radiobutton or checkbox instead.
 *    choicePattern is required
 *    checked indicates whether the choice should be selected or unselected.  May be omitted, defaults to true.
 * Throws exception if ambiguity or failure to match.
 */
function pickImpl(/*Document*/doc, /*listPattern,choicePattern,checked*/args, /*optional Range*/ context, /*optional function*/ feedbackHandler) {
  args = expandArguments(args, true);
  doPick(doc, args[0], args[1], args[2], "pick", context, feedbackHandler);
}

function expandArguments(/*listPattern,choicePattern,checked*/args, /*boolean*/ defaultChecked) {
  switch (args.length) {
    case 0:
      throw new Error("pick() must have at least one argument");
    case 1:
      return [undefined, args[0], defaultChecked];
    case 2:
      if (typeof args[1] == "boolean") {
        return [undefined, args[0], args[1]];
      } else {
        return [args[0], args[1], defaultChecked];
      }
    default:
      return args;
  }      
}

/**
 * Unselects a listbox item, dropdown item, or a checkbox.
 * Throws exception if ambiguity or failure to match.
 */
function unpickImpl(/*Document*/doc, /*listPattern,choicePattern,checked*/args, /*optional Range*/ context, /*optional function*/ feedbackHandler) {
  args = expandArguments(args, false);
  doPick(doc, args[0], args[1], args[2], "unpick", context, feedbackHandler);
}

function doPick (/*Document*/doc, 
                 /*optional Pattern*/listPattern, 
                 /*Pattern*/choicePattern, 
                 /*boolean*/ value,
                 /*string*/ commandName, 
                 /*optional Range*/ context,
                 /*optional function*/ feedbackHandler) {
  var bestMatch = null;
  
  if (listPattern === undefined) {
    // find best option, radio button, or checkbox in the whole document
    var m = Pattern.find(doc, choicePattern, [Pattern.CHECKBOX, Pattern.RADIOBUTTON, Pattern.LISTITEM], context);
    if (m.count == 0) {
      throw addMatchToError(new Error("No match for " + commandName + "(" + choicePattern + ")"), m);
    } else if (m.count > 1) {
      throw addMatchToError(new Error("More than one best match for " + commandName + "(" + choicePattern + ")"), m);
    }
    
    bestMatch = m;
    
  } else {
    // STEP 1: find the <SELECT> node that best matches listPattern
    var m = Pattern.find(doc, listPattern, [Pattern.LISTBOX], context);
    if (m.count == 0) {
      throw addMatchToError(new Error("No match for " + commandName + "(" + listPattern + ")"), m);
    } else if (m.count > 1) {
      throw addMatchToError(new Error("More than one best match for " + commandName + "(" + listPattern + ")"), m);
    }

    // STEP 2: find best <OPTION> within the <SELECT>
    var m2 = Pattern.find(doc, choicePattern, [Pattern.LISTITEM], m.range);
    if (m2.count == 0) {
      throw addMatchToError(new Error("No match for " + commandName + "(" + choicePattern + ")"), m);
    } else if (m2.count > 1) {
      throw addMatchToError(new Error("More than one best match for " + commandName + "(" + choicePattern + ")"), m);
    }
    
    bestMatch = m2;    
  }
  Test.assertTrue(bestMatch, "bestMatch was not assigned");

  var node = bestMatch.element;
    
  if (feedbackHandler) feedbackHandler(node, doThePick);
  else doThePick();
  
  function doThePick() {  
      simulatePick(node, value);
  }
}

/**
 * Simulate a selection of a list option, radio button, or checkbox.
 * Changes the value of the selection, and fires mouse events and change events.
 */
function simulatePick(/*Option or RadioButton or Checkbox Node*/ node, /*boolean*/ value) {
  if (node.wrappedJSObject) {node = node.wrappedJSObject;}
  //selected or checked as a property in XUL covers some
  //radiobuttons, checkboxes, and listitems
  if ((instanceOf(node.ownerDocument, XULDocument))
     && ((("selected" in node) && (value != node.selected))
       || (("checked" in node) && (value != node.checked))
       || (isListitem(node))
       || (isMenuItem(node)))) {
    //a direct click() event is fired to the node to reach anonymous content
    //which seems to be unaffected by firing mouse events at it
     node.click() }
  //fireMouseEvent('mousedown', node);
  //fireMouseEvent('mouseup', node);
  //fireMouseEvent('click', node); }
  
  //for xul radiobuttons and listitems with selected only as an attribute
  else if ((instanceOf(node.ownerDocument, XULDocument))
         && (node.hasAttribute('selected'))
         && (value != (node.getAttribute('selected')))) {
         node.click();
         node.setAttribute('selected', value); }
         
  //for xul checkboxes with checked only as an attribute
  else if ((instanceOf(node.ownerDocument, XULDocument))
          && (node.hasAttribute('checked'))
          && (value != (node.getAttribute('checked')))) {
          node.click();
          node.setAttribute('checked', value); }
  
  //for html elements that do not need a click event to be sent at all        
  // select the option
  else {
    if ("selected" in node) {
    // it's an OPTION element
    node.selected = value;
  } else if ("checked" in node) {
    node.checked = value;
  } else {
    throw addMatchToError(new Error("Don't know how to pick " + node), nodeToMatch(node));
  } }
  
  // simulate the change event
  fireEvent('change', node);
}


/**
 * Finds the form that is most closely linked
 * to 'pattern' and resets the value of the form to
 * its original value
 */
function resetImpl(/*Document*/ doc, /*string*/pattern) {

  var m = Pattern.find(doc, pattern);

  // make sure exactly one best match
  if (m.count == 0) {
    throw addMatchToError(new Error("No match for reset(" + pattern + ")"), m);
  } else if (m.count > 1) {
    throw addMatchToError(new Error("More than one best match for reset(" + pattern + ")"), m);
  }
  
  // use the one best match
  var node = m.element;  
  node.reset();
  
}
/**
 * Visibly highlight all matches to a pattern.  The text in each match is highlighted using
 * Firefox's built-in text highlighting (as if you had dragged the mouse over it), and the
 * HTML node for each match is displayed by a translucent rectangle.
 *
 * This function works even if some of the matches are inside subframes of win.  
 *
 * @param win     HTML window where the selections should be made.
 * @param match   iteration of matches to highlight
 */
function selectImpl(/*Document*/ doc, /*Pattern*/ pattern, /*optional Match*/ context) {
  selectAll(doc.defaultView, Pattern.find(doc, pattern, [], context));
}



/**
 * Visibly highlight all elements in a Match iteration.  
 *
 * @param win     HTML window where the selections should be made.
 * @param match   iteration of matches to highlight
 */
function selectAll(/*HtmlWindow*/ win, /*Match*/ match) {

  clearSelection(win);

  // retrieve selection object for making text highlights    
  var currentSelection = win.getSelection();

  // list of highlights we added
  var highlights = []
  
  for (var m = match; m.hasMatch; m = m.next) {
    // make sure text is selected
    if (m.range) {
      currentSelection.addRange(m.range);
    }
    
    // make sure nontext objects (e.g. buttons, images) are outlined
    if (m.element) {
      var e = m.element;
      var box = Chickenfoot.Box.forNode(e);
      var doc = e.ownerDocument;
      var body = doc.getElementsByTagName("body")[0];
      var div = makeTranslucentRectangle(body, box.x, box.y, box.w, box.h, "#f00", 0.4)
      div.setAttribute("class", "_chickenfootSelection");
      highlights.push(div)
    }
  }

  if (highlights.length > 0) {
    // make a clear DIV over the entire window -- partly to capture the click event to clear the selection,
    // and partly to remember all the highlight divs that were created.
    // Add this div last, so that it lies on top of the selection highlight divs and captures the click event.
    var body = win.document.getElementsByTagName("body")[0]
    var box = Box.forNode(body)
    var w = Math.max(box.width, win.innerWidth)
    var h = Math.max(box.height, win.innerHeight)
    var holder = makeTranslucentRectangle(body, 0, 0, w, h, "#ffffff", 0)
    holder.setAttribute("id", "_chickenfootSelectionHolder")
    holder.highlights = highlights
    holder.addEventListener("click", function () {
      clearSelection(win);
    }, true);
  }

  // Helper function that makes translucent rectangles.  
  function makeTranslucentRectangle(/*Node*/ parent, /*int*/ left, top, width, height, /*String*/ color, /*float*/ opacity) {
    var doc = parent.ownerDocument
    var div = doc.createElement("div");
    div.setAttribute("style",
      "position: absolute; "
     +"width: " + width + "px; "     
     +"height: " + height + "px; "
     +"left: " + left + "px; "
     +"top: " + top + "px; "
     +"background-color: " + color + "; "
     +"opacity: " + opacity);
    parent.appendChild(div)
    return div
  }
  
}

/**
 * Clear all highlights displayed by a call to selectAll().
 * (This happens automatically when selectAll() is called again on a window,
 * or when the user clicks anywhere in the window.)
 * @param win  HTML window whose selection highlights should be cleared
 */
function clearSelection(/*HtmlWindow*/ win) {
  var currentSelection = win.getSelection();
  currentSelection.removeAllRanges();

  var holder = win.document.getElementById("_chickenfootSelectionHolder")
  if (holder) {   
    var nodes = holder.highlights;
    for (var i = 0; i < nodes.length; ++i) {
      var e = nodes[i];
      e.parentNode.removeChild(e)
    }
    holder.parentNode.removeChild(holder)
  }
}


/**
 * Opens a new browser tab
 *
 * @param chromeWindow Firefox window in which to create the tab
 * @param url url to load in new tab
 * @param OPTIONAL bringToFront if true, brings the new tab to the front of the tab stack; default is false.
 * @param OPTIONAL invisible if true, the tab is initially hidden (used by fetch()).  Default is false.
 * @return Tab object
 */
function openTabImpl(/*ChromeWindow*/chromeWindow, 
                     /*String*/url, 
                     /*optional boolean*/bringToFront,
                     /*optional boolean*/invisible) {
  var tabbrowser = getTabBrowser(chromeWindow);
  var tab = tabbrowser.addTab(url ? url.toString() : "about:blank");
  var browser = tabbrowser.getBrowserForTab(tab);
  var win = browser.contentWindow;
  var tabObject = new Tab(win, tabbrowser, tab);

  if (bringToFront) {
    tabbrowser.selectedTab = tab;
  }
  if (invisible) {
    tab.setAttribute("collapsed", "true");
  }
  return tabObject;
}

/**
 * Finds a loaded tab.
 *   chromeWindow: browser window calling this function
 *   tabs: array of tabs or a single tab whose loaded status to check.  If not provided or null,
 *         then the current tab in chromeWindow is used.
 *   block: if true, then this function doesn't return until at least one tab in tabs is loaded.
 *
 * This function finds a tab in the tabs array that is fully loaded.  (If no such tab exists, 
 * then behavior depends on the block parameter.  If block is true, then the function waits until 
 * at least one tab is loaded; otherwise, it returns null immediately.)
 *
 * When a tab is loaded, the loaded tab is removed from the tabs array (using splice) and returned.
 * If more than one tab is loaded, then the choice of which to remove and return is arbitrary.
 */
function waitImpl(/*ChromeWindow*/ chromeWindow, /*optional Tab[]*/ tabs, /*boolean*/ block) {
  // If no tabs provided, assume current tab in chromeWindow
  if (!tabs) {
    tabs = [new Tab(getVisibleHtmlWindow(chromeWindow))];
  }

  // Check if tabs is already an array.
  if (!instanceOf(tabs, Array)) {
    tabs = [tabs];
  } 

  // return immediately if no tabs to look at
  if (!tabs.length) return null;

  // make sure all tabs are Tabs
  for (var i = 0; i < tabs.length; ++i) {
    if (!instanceOf(tabs[i], Tab)) {
      tabs[i] = new Tab(tabs[i]);
    }
  }

  // scan tabs looking for one that's loaded
  var count = 0;
  const delay = 0.100;
  const maxDelay = 30;
  const iterations = maxDelay/delay;
  for (var i = 0; i < iterations; ++i) {  
    for (var i = 0; i < tabs.length; ++i) {
      var tab = tabs[i];
      if (isWindowLoaded(tab._window)) {
        tabs.splice(i, 1)      
        return tab;
      }
    }
    
    if (!block) break;

    sleepImpl(chromeWindow, 100);
  }

  return null;
}

/**
 * calls the given function when the given tab has finished loading
 */
function whenLoadedImpl(/*ChromeWindow*/ chromeWindow,
                         /*function*/ func, 
                         /*optional Tab or Window*/ tabOrWindow) {
  var window = undefined;
  if (!tabOrWindow) {
    window = getVisibleHtmlWindow(chromeWindow);
  } else if (instanceOf(tabOrWindow, Tab)) {
    window = tabOrWindow._window
  } else {
    window = tabOrWindow;
  }    

	var browser = getTabBrowser(chromeWindow);
	
	var wrapperFuncRan = false
	var wrapperFunc = function(event) {
		var eventWindow = event.originalTarget.defaultView;
		if (!wrapperFuncRan && eventWindow == window) {
			wrapperFuncRan = true
			browser.removeEventListener("load", wrapperFunc, true)
			// defer the actual function execution, because otherwise
			// it won't be able to do go()'s itself
			chromeWindow.setTimeout(func, 0);
		}
	}
	browser.addEventListener("load", wrapperFunc, true)
	
	var alreadyLoaded = false;
	try {
		alreadyLoaded = isWindowLoaded(window);
	} catch (e) {
		// will fall here, e.g., if it's an iframe and we don't know if
		// it's loaded
	}
	if (alreadyLoaded) {
		wrapperFunc({originalTarget : browser.contentDocument})
	}
}

/**
 * Box is a simple class that represents a box
 * with its upper-left corner at (x,y)
 * and a width of w and a height of h.
 *
 * It also has accessors for its corners:
 *  (x1,y1) is upper-left corner
 *  (x2,y2) is lower-right corner
 */
function Box(x, y, w, h) {
  this.x = this.x1 = x;
  this.y = this.y1 = y;
  this.w = this.width = w;
  this.h = this.height = h;  
  this.x2 = x + w;
  this.y2 = y + h;
}

/**
 * A dimensionless box at (0,0) 
 */
Box.ZERO = new Box(0, 0, 0, 0);

/** toString() displays x,y,w,h data for Box */
Box.prototype.toString = function() {
  return '<box x="' + this.x + '" y="' + this.y + 
         '" w="'+ this.w + '" h="' + this.h + '" />';
}

/**
 * Determine whether this box is left, right, above, or below 
 * another box.
 * @param b other box
 * @param tolerance 
 * @returns "left" if this is left of b
 *          "right" if this is right of b
 *          "above" if this is above b
 *          "below" if this is below b
 *          "intersects" if this intersects b
 *          null if this is unrelated to b
 */
Box.prototype.relatedTo = function(/*Box*/ b, /*int*/ tolerance) {
  if (!tolerance) tolerance = 0;
  
  var overlapsVertically = (this.y1 < b.y2+tolerance) && (b.y1 < this.y2+tolerance);
  var overlapsHorizontally = (this.x1 < b.x2+tolerance) && (b.x1 < this.x2+tolerance);

  if (overlapsVertically && overlapsHorizontally) {
    return "intersects";
  } else if (overlapsVertically /* but not horizontally */) {
    return (this.x1 < b.x1+tolerance) ? "left" : "right";
  } else if (overlapsHorizontally /* but not vertically */) {
    return (this.y1 < b.y1+tolerance) ? "above" : "below";
  } else {
    return null;
  }
}

/**
 * Get bounding box of a DOM node.
 * Reliable results for Element nodes;
 * heuristic guess for Text nodes (since Firefox doesn't provide the bbox
 * directly);  other kinds of nodes return Box.ZERO.
 */ 
Box.forNode = function(/*Node*/ node) {
  if (!node) return Box.ZERO;

  if (node.nodeType == Node.ELEMENT_NODE) {
    return Box.forElement(node);
  }
  
  if (node.nodeType == Node.TEXT_NODE) {
    var boxParent = Box.forNode(node.parentNode);

    // find next and previous sibling Element
    function getSiblingElement(/*Node*/node, /*nextSibling|previousSibling*/ direction) {
      do {
        node = node[direction];
      } while (node != null && node.nodeType != Chickenfoot.Node.ELEMENT_NODE);
      return node;
    }
    var prev = getSiblingElement(node, "previousSibling");
    var next = getSiblingElement(node, "nextSibling");

    var boxPrev = prev ? Box.forNode(prev) : null;
    var boxNext = next ? Box.forNode(next) : null;
    //debug(boxParent + ": " + boxPrev+ "->" + boxNext);

    // it's more convenient to compute the
    // two corners of the bounding box, (x1,y1) and (x2, y2).
    // By default, assume our parent's bounding box, and
    // and make further adjustments below.
    var x1 = boxParent.x1;
    var y1 = boxParent.y1;
    var x2 = boxParent.x2;
    var y2 = boxParent.y2;

    if (prev && next) {
      // if prev and next overlap vertically,
      // and prev precedes next horizontally,
      // then assume node is sandwiched between them
      // horizontally.
      if (boxNext.y < boxPrev.y + boxPrev.height
          && boxNext.x > boxPrev.x) {
        x1 = boxPrev.x2;
        y1 = boxPrev.y1;
        x2 = boxNext.x1;
        y2 = boxNext.y2;
      } else {
        // assume node starts on same line as prev,
	// and ends on same line as next
        x1 = boxPrev.x2;
        y1 = boxPrev.y1;
        x2 = boxNext.x1;
        y2 = boxNext.y2;
        
      }
    } else if (next /* && !prev */) {
      y2 = boxNext.y2;
    } else if (prev /* && !next*/) {
      y1 = boxPrev.y1;
    }

    if (boxPrev) {
      // If boxPrev is flush with right of parent (modulo 5 pixels), node lies entirely below it.
      if (boxPrev.x2 >= boxParent.x2 - 5) y1 = boxPrev.y2;
      // If boxPrev is flush with bottom of parent (modulo 5 pixels), node lies entirely right of it.
      if (boxPrev.y2 >= boxParent.y2 - 5) x1 = boxPrev.x2;
    }

    if (boxNext) {
      // If boxNext is flush with left of parent (modulo 5 pixels), node lies entirely above it.
      if (boxNext.x1 <= boxParent.x1 + 5) y2 = boxNext.y1;
  
      // If boxNext is flush with top of parent (modulo 5 pixels), node lies entirely left of it.
      if (boxNext.y1 <= boxParent.y1 + 5) x2 = boxNext.x1;
    }

    box = new Box(x1, y1, x2-x1, y2-y1);
  
    // error below occurs when Text node is a direct
    // descendant of BODY, so something needs to
    // be done to fix this in general
    
    //try {
    //  var p = box.x;
    //} catch (e) {
    //  debug('did not find box for ' + node);
    //  debug('parent was: ' + node.parentNode);
    //}
  
    return box;
  
  }
  
  // otherwise, we don't know how to find bbox for 
  // this type of node
  return Box.ZERO;
}

Box.forElement = function(/*Element*/ node) {
    // dynamically choose the right implementation
    // on first call
    if (node.ownerDocument.getBoxObjectFor) {      
      // FF 3.0-3.5
      Box.forElement = function(/*Element*/ node) {
        var b = node.ownerDocument.getBoxObjectFor(node);
        return new Box(b.x, b.y, b.width, b.height);
      }
    } else {
      // FF 3.6+
      Box.forElement = function(/*Element*/ node) {
          var b = node.getBoundingClientRect();    
          var win = node.ownerDocument.defaultView;
          return new Box(Math.round(b.left + win.pageXOffset),
                         Math.round(b.top + win.pageYOffset),
                         Math.round(b.width),
                         Math.round(b.height));
      }
    }
    
    // call the implementation we just chose
    return Box.forElement(node);
}
 
goog.require('goog.string');
goog.require('goog.style');

/**
 * A TextBlob is a sequence of text nodes that are
 * delimited by block tags (like <p> or <div>)
 * but not by flow tags (like <a> or <b> or <span>)
 * and appearing in the <BODY> element of the page.
 * 
 * Value is the concatenation of the text node values, 
 * but also:
 * - omits leading and trailing whitespace 
 * - compresses runs of whitespace into a single space char
 * - omits text from text nodes inside SCRIPT or STYLE elements
 *
 * Its properties are:
 *  value  (the string value)
 *  firstNode  (the first text node in the sequence)
 *  lastNode   (the last text node in the sequence)
 *
 */
function TextBlob(/*String*/ value, /*Node*/ firstNode, /*optional Node*/ lastNode) {
  this.value = value;
  this.firstNode = firstNode;
  this.lastNode = lastNode ? lastNode : firstNode;  
}

/** @return {Node} least common ancestor of this.firstNode and this.lastNode */
TextBlob.prototype.getContainer = function() {
  if (this.firstNode === this.lastNode) return this.firstNode;
  var firstIndex = getChildIndex(this.firstNode);
  var lastIndex = getChildIndex(this.lastNode);
  var range = this.firstNode.ownerDocument.createRange();
  range.setStart(this.firstNode.parentNode, firstIndex);
  range.setEnd(this.lastNode.parentNode, lastIndex + 1);
  return rangeToContainer(range);
}

TextBlob.prototype.toString = function() {
  return this.value;
}

TextBlob.isFlowTag = {
// elements chosen based on HTML 4.01 spec
// http://www.w3.org/TR/REC-html40/struct/text.html

// Section 9.2.1 Phrase elements
'EM' : 1,
'STRONG' : 1,
'CITE' : 1,
'DFN' : 1,
'CODE' : 1,
'SAMP' : 1,
'KBD' : 1,
'VAR' : 1,
'ABBR' : 1,
'ACRONYM' : 1,

// Section 9.2.3 Subscripts and superscripts
'SUB' : 1,
'SUP' : 1,

// Section 15.2.1 Font style elements
'TT' : 1,
'I' : 1,
'B' : 1,
'BIG' : 1,
'SMALL' : 1,
'STRIKE' : 1,
'S' : 1,
'U' : 1,

// Section 15.2.2 Font modifier elements
'FONT' : 1,
'BASEFONT' : 1,

// Others that I think belong
'SPAN' : 1,
'A' : 1,
// 'BR : 1  // not sure about this one
};


/**
 * TextBlobIterator converts a Document or subtree of a Document into a 
 * stream of TextBlobs.
 *
 * Properties:
 *   root   Node used as root of iteration
 *   blob   last blob returned by next()
 *          (undefined before first call to next(); 
 *           null after next() returns null)
 *
 * Example:
 *   var iter = new TextBlobIterator(document);
 *   while (blob = iter.next()) {
 *      output(blob);
 *   }
 */
function TextBlobIterator(/*Document|Node*/ root) {
  if (root.body) {root = root.body}
  this.root = root;
  this._iterator = createTreeWalker(root, NodeFilter.SHOW_ALL);
  this._iteratorDone = false;
}

/**
 * Get the next blob in the iteration.
 * First call to this method returns the first blob;
 * returns null after the last blob has been yielded.
 */
TextBlobIterator.prototype.next = function() {
  var iterator = this._iterator;
  var blob = null;
  var iteratorDone = this._iteratorDone;
  var blobDone = false;

  while (!iteratorDone && !blobDone) {
    node = iterator.currentNode;
    //debug("looking at " + node);
    
    if (node.nodeType == Node.ELEMENT_NODE
        && !TextBlob.isFlowTag[upperCaseOrNull(node.tagName)]
        && blob) {
      // we're entering a new block element, so close off the blob
      break;
    }

    var text = this._getTextOfNode(node);
    if (text
           // check if text is all whitespace; if it is,
           // we don't start a new blob, but we do add it to an existing blob.
        && (blob || goog.string.trim(text))) {
      if (!blob) blob = this._makeBlob();
      this._addNodeToBlob(blob, text, node);
    }
    
    // advance iterator to next node in preorder
    var next = null;
    
    // visit children only if current node isn't hidden (like SCRIPT or STYLE) 
    if (this._isElementIncluded(node)) {
      next = iterator.firstChild();
    }
    if (!next) {
      next = iterator.nextSibling();
    }
    while (!iteratorDone && !next) {
      iteratorDone = !iterator.parentNode();
      if (!iteratorDone) {
        node = iterator.currentNode;
        if (blob && !TextBlob.isFlowTag[upperCaseOrNull(node.tagName)]) {
          // we're leaving a block element, so close off the blob
          blobDone = true;
        }
        next = iterator.nextSibling();
      }
    }
  }

  this._iteratorDone = iteratorDone;
  if (blob) {
    this._finishBlob(blob);
  }
  return blob;
}

/** returns false if the node parameter should not be included in a text blob iterator,
true otherwise */
TextBlobIterator.prototype._isElementIncluded = function(/*Node*/ node) {
    var hiddenElements = { STYLE:1, SCRIPT:1, NOSCRIPT:1 };
    
    if (node.tagName && hiddenElements[upperCaseOrNull(node.tagName)]) {
        return false;
    }
       
    if (node.nodeType == Node.ELEMENT_NODE &&
           (goog.style.getComputedStyle(node, "visibility") == "hidden"
            || goog.style.getComputedStyle(node, "display") == "none")) {
        return false;
    }
    
    return true;
}

/**
 * Make a new TextBlob for iterator.  
 * Overridden by subclasses of TextBlobIterator.
 */
TextBlobIterator.prototype._makeBlob = function() {
  var blob = new TextBlob();
  blob._stringBuffer = new StringBuffer();
  return blob;
}

/**
 * Get the visible text out of a node.
 * Overridden by subclasses of TextBlobIterator.
 * @return string of text or null if node type offers no visible text.
 */
TextBlobIterator.prototype._getTextOfNode = function(/*Node*/ node) {
  if (node.nodeType == Node.TEXT_NODE) return node.nodeValue;
  
  if (node.nodeType == Node.ELEMENT_NODE) {      
    if (upperCaseOrNull(node.tagName) == 'INPUT'
        && (node.type == 'submit'
            || node.type == 'button'
            || node.type == 'reset'
            || node.type == 'image')
        && node.value) {
      // labels of buttons (BUTTON elements have their labels as text nodes, so that's
      // handled above)
      return node.value;
    }
    
    if (node.tagName == 'description') {
      return node.textContent; }
    
    if (node.tagName == 'label') {
      if (node.getAttribute('value')) {return node.getAttribute('value');}
      else {return node.textContent; }
      }
    
    if (node.tagName == 'textbox'
        || node.tagName == 'xul:textbox'
        || node.tagName == 'listbox') {
      return node.id; }
      
    if (node.tagName == 'button'
       || node.tagName == 'toolbarbutton'
       || node.tagName == 'checkbox'
       || node.tagName == 'radio'
       || node.tagName == 'menulist') {
      return (node.id + " " + node.getAttribute('label') + " " + node.tooltiptext + " " + node.label);}
    
    if ((node.tagName == 'menu')
       || (node.tagName == 'tab')
       || (node.tagName == 'menuitem')
       || (node.tagName == 'listitem')
       || (node.tagName == 'xul:toolbarbutton')
       || (node.tagName == 'caption')) {
      return (node.getAttribute('label') + " " + node.label); }
    
    if ('alt' in node) {
      // ALT attributes for images
      return node.alt; }
    
    
  }
  
  // otherwise
  return null;
}

/**
 * Add a text node to the blob.
 * Overridden by subclasses of TextBlobIterator.
 */
TextBlobIterator.prototype._addNodeToBlob = function(/*TextBlob*/blob, /*String*/ text, /*Node*/ node) {
  if (!blob.firstNode) blob.firstNode = node;
  blob.lastNode = node;
  blob._stringBuffer.append(text);
}

/**
 * Close off the blob.
 * Overridden by subclasses of TextBlobIterator.
 */
TextBlobIterator.prototype._finishBlob = function(/*TextBlob*/blob) {
  blob.value = condenseSpaces(blob._stringBuffer.toString());
  delete blob._stringBuffer; // don't need it anymore, reclaim it
}

/**
 * Define a unique ID generator
 */

// Define unique ID generator constructor

function UidGen() {
   // Initialize object properties
   this.id = 0;
}

UidGen.prototype.nextId = function() {
  return this.id++;
}

UidGen.prototype.current = function() {
  return this.id;
}


/**
    Animates a growing green transparent rectangle over the given node,
    and when it's done, it calls "thenDoThis".
    
    @param  node        A node in a webpage.
    @param  thenDoThis  A function that will get called after the animation is complete (or null)
    @return             Returns a feeling of awe.
*/
function /*void*/ animateTransparentRectangleOverNode(/*Node*/ node, /*function*/ thenDoThis) {

    // set a local version of document and window for use in the following helper functions,
    // so they can feel as if they are in a webpage
    var document = node.ownerDocument
    var window = document.defaultView

    // helper function to get the position of a node
    function getNodePosition(node) {
        var pos = {}
        if ("offsetLeft" in node) {
            pos.x = node.offsetLeft
            pos.y = node.offsetTop
            pos.w = node.offsetWidth
            pos.h = node.offsetHeight
            if (node.offsetParent != null) {
                var parentPos = getNodePosition(node.offsetParent)
                pos.x += parentPos.x
                pos.y += parentPos.y
            }
        } else if (node.parentNode != null) {
            pos = getNodePosition(node.parentNode)
        } else {
            pos.x = 0
            pos.y = 0
            pos.w = 0
            pos.h = 0
        }
        return pos
    }
    
    // helper function to set location, size, opacity and color of a div
    function setDivStyle(div, x, y, w, h, o, color) {
        if (color == undefined) {
            color = "green"
        }
        div.style.position = "absolute"
        div.style.left = x + "px"
        div.style.top = y + "px"
        div.style.width = w + "px"
        div.style.height = h + "px"
        div.style.backgroundColor = color
        div.style.opacity = o
        
        // NOTE: this is not a magic number, we just want something bigger than anything on the page,
        // and 1000000 is usually good enough
        div.style.zIndex = 1000000
    }
    
    // helper function to create a div with the desired location, size, opacity and color    
    function createDiv(x, y, w, h, o, color) {
        var div = document.createElement("DIV")
        setDivStyle(div, x, y, w, h, o, color)
        document.body.appendChild(div)
        return div
    }
    
    // if the node is a listitem in some combo box,
    // then we usually want to highlight the combo box itself,
    // which is the parent of the listitem
    if (upperCaseOrNull(node.tagName) == "OPTION") {
        node = node.parentNode
    }
    
    // the idea is this,
    // we create two divs (div and div2) both at the location of the original node,
    // and then we create a series of timer events which enlarges one of the divs,
    // and makes it more transparent as it gets bigger,
    // and in the end, we call "thenDoThis"

    // we initialize these variables here, and we'll reference them inside the timer event handler below
    var pos = getNodePosition(node)
    var o = 1.0
    var div = createDiv(pos.x, pos.y, pos.w, pos.h, o, "green")
    var div2 = createDiv(pos.x, pos.y, pos.w, pos.h, 0.5, "green")
    
    var totalUpdates = 8
    var timeBetweenUpdates = 50
    
    for (var i = 1; i <= totalUpdates; i++) {
        var inc = 3
        window.setTimeout(function () {
            pos.x -= inc
            pos.y -= inc
            pos.w -= -2 * inc
            pos.h -= -2 * inc
            o /= 1.3
            
            try {
                setDivStyle(div, pos.x, pos.y, pos.w, pos.h, o, "green")
            } catch (e) {}
        }, i * timeBetweenUpdates)
    }
    window.setTimeout(function () {
        div.parentNode.removeChild(div)
        div2.parentNode.removeChild(div2)
        if (thenDoThis != undefined) {
            thenDoThis()
        }
    }, totalUpdates * timeBetweenUpdates + 100)
}

/**
 * createDeepTreeWalker()
 *    Creates a deepTreeWalker that filters a subtree of a XUL DOM tree.
 *
 * createDeepTreeWalker(root, whatToShow, [acceptNode])
 *
 * Parameters:
 * - root
 *     XUL DOM node, root of subtree to be walked
 * - whatToShow 
 *     node types that should be returned by the TreeWalker, OR'ed together:
 *       NodeFilter.SHOW_ELEMENT
 *       NodeFilter.SHOW_TEXT
 *       NodeFilter.SHOW_ATTRIBUTE
 *       NodeFilter.SHOW_COMMENT
 *       NodeFilter.SHOW_ALL (for all DOM nodes)
 * - [predicate]
 *     optional user-defined filter function of type 
 *     DOMNode -> oneof(NodeFilter.FILTER_ACCEPT, NodeFilter.FILTER_SKIP)
 *     Nodes that pass the whatToShow filter are passed to this predicate function.
 *     predicate may return one of two values:
 *       true to make the TreeWalker return the node
 *       false to make TreeWalker skip the node, but still consider its children
 * - [searchAllXULDocs]
 *     optional boolean value that tells whether to search all XUL documents or not
 *     useful for searching chromeWindow, and want to include other chromeWindows in search,
 *       such as chickenfoot script editor chromeWindow
 */

function createDeepTreeWalker(node, whatToShow, predicate, searchAllXULDocs) {  
  // predicate is optional
  if ((predicate === undefined) || !predicate) {
    predicate = function () {return true};
  }
  
  if (searchAllXULDocs && (searchAllXULDocs == true)) {var docs = getAllXULDocuments(node, []);}
  else {var docs = null;}
  
  var deepTreeWalker = Components.classes["@mozilla.org/inspector/deep-tree-walker;1"]
                    .createInstance(Components.interfaces.inIDeepTreeWalker);
  deepTreeWalker.showAnonymousContent = true;
  deepTreeWalker.init(node, whatToShow);
  
  //impossible to pass a filter to deepTreeWalker, so this wrapper
  //does the filtering itself, and returns the nextNode() that passes
  //the filter, not just the nextNode() in the XUL DOM tree
  var wrapper = new deepTreeWalkerWrapper(deepTreeWalker, predicate, docs);
  return wrapper;
}

function deepTreeWalkerWrapper(walker, predicate, docs) {
  this.predicate = predicate;
  this.walker = walker;
  this.root = walker.root;
  this.whatToShow = walker.whatToShow;
  this.currentNode = walker.currentNode;
  this.XULDocs = docs;
  this.XULDocCounter = 0;
}

deepTreeWalkerWrapper.prototype.nextNode = function() {
  var next = this.walker.nextNode();
  
  while (next && (!this.predicate(next)) && (!this.predicate(next.wrappedJSObject))) {
    next = this.walker.nextNode()
  }
  
  if (!next && this.XULDocs && this.XULDocs[this.XULDocCounter]) {
    this.walker = createDeepTreeWalker(this.XULDocs[this.XULDocCounter], this.whatToShow, this.predicate, false);
    this.XULDocCounter += 1;
    next = this.walker.nextNode();
  }

  return next;
}

deepTreeWalkerWrapper.prototype.parentNode = function() {
  return this.currentNode.parentNode();
}

function getAllXULDocuments (/*XUL Document or Element*/ root, /*Array*/ docs) {
  var predicate = 
    function (node) {
      return (node && ((node.nodeName == 'xul:browser') 
                       || (node.nodeName == 'browser') 
                       || (node.tagName == 'iframe'))); }
  var treewalker = createDeepTreeWalker(root, NodeFilter.SHOW_ELEMENT, predicate);
  var current = treewalker.nextNode();
  while(current) {
    try {
    if (instanceOf(current.contentDocument, XULDocument)) {
      if (current.contentDocument.wrappedJSObject) {docs.push(current.contentDocument.wrappedJSObject);}
      else {docs.push(current.contentDocument);}
      getAllXULDocuments(current.contentDocument, docs);
    }
    if (instanceOf(current.document, XULDocument)) {
      if (current.document.wrappedJSObject) {docs.push(current.document.wrappedJSObject);}
      else {docs.push(current.document);}
      getAllXULDocuments(current.document, docs);
    }
    }
    catch(err) {}
    current = treewalker.nextNode();
  }
  return docs;
}
/*
 * Define helper methods to flatten DOM
 */

/*
 * Mozilla's DOM parser does an interesting thing with <script> tags.
 * First, consider the following:
 * 
 * <script><!-- true; --></script>
 * 
 * This gets parsed as an [object HTMLScriptElement] with 1 child node whose type
 * is Node.TEXT_NODE and whose nodeValue is "<!-- true; -->"
 * Note that the "<!--" and "-->" are included in the nodeValue.
 *
 * However, Mozilla's DOM parser treats the following differently:
 *
 * <p><!-- true; --></p>
 *
 * This gets parsed as an [object HTMLParagraphElement] with 1 child node whose type
 * is Node.COMMENT_NODE and whose nodeValue is " true;"
 * Note that the "<!--" and "-->" are NOT included in the nodeValue
 * and that a Node.COMMENT_NODE has no children.
 *
 * This means that child nodes of <script> tags must be treated in a special way.
 * This also seems to be the case for <style> elements.
 */

function flattenDom(rootNode, uidgen, nodes) {
  if (!uidgen) uidgen = new UidGen();
  if (!nodes) nodes = [];
  var buffer = new StringBuffer();
  flatten(rootNode, uidgen, nodes, buffer);
  return [buffer.toString(), nodes, uidgen];
}

/**
 * Unroll/flatten a Node (the DOM) into a string of xhtml
 * @param n a Node
 * @return a flattened xhtml string representation of the node
 */
function flatten(n, nodeCount, nodes, buffer) {
   // TODO removing IFRAME may break some invariants, should investigate
   if (n.nodeType == Node.ELEMENT_NODE && upperCaseOrNull(n.tagName) == "IFRAME") return "";
   var id = nodeCount.nextId();
   nodes[id] = n;
   n["_MozillaDocumentId"] = id; // make it possible to look up place in array in constant time
   switch(n.nodeType) {
      case Node.ELEMENT_NODE :
         return flattenElementNode(n, nodeCount, nodes, buffer);
      case Node.TEXT_NODE :
         return flattenTextNode(n, nodeCount, nodes, buffer);
      case Node.COMMENT_NODE :
         return flattenCommentNode(n, nodeCount, nodes, buffer);
   }
}

function removeXmlChars(str) {
  if (!str) return "";
  // negative lookahead, explained:
  // http://www.amk.ca/python/howto/regex/regex.html#SECTION000540000000000000000
  str = str.replace(/&(?!amp;$)/g, '&amp;');
  str = str.replace(/</g, '&lt;');
  str = str.replace(/\"/g, '&quot;');
  return str;
}

attributeNameRegexp = /^[A-Za-z_][A-Za-z0-9_-]*$/;

/**
 * @param n, a Node of type Element
 * @return a flattened xml string representation of the node
 */
function flattenElementNode(n, nodeCount, nodes, buffer) {
  buffer.append("<" + n.tagName);
  // add attributes
  if(n.hasAttributes()) {
     var nodeMap = n.attributes;
     for(var i = 0; i < nodeMap.length; i++) {
        attr = nodeMap.item(i);
        if (!attr.nodeName.match(attributeNameRegexp)) continue;
        
        if (upperCaseOrNull(n.tagName) == 'A' && attr.nodeName == 'href') {
          value = n.toString(); // turns relative URLs into absolute ones
          n.setAttribute('href', value); // replace in DOM
        } else {
          value = attr.nodeValue;
        }

        // escape & and < character
        buffer.append(" " + attr.nodeName + "=\"" + removeXmlChars(value) + "\"");
     }
  }
  buffer.append(">");
  
  // add children
  if(n.hasChildNodes()) {
    var children = n.childNodes;
    for(var i = 0; i < children.length; i++) {
      child = children[i];
      buffer.append(flatten(child, nodeCount, nodes, buffer));
    }
  }

  // close element
  buffer.append("</" + n.tagName + ">");
}

function flattenCommentNode(n, nodeCount, nodes, buffer) {
  buffer.append("<!-- -->"); // drop n.nodeValue as it adds nothing
                             // and only seems to screw up the XML parser
                             // the comment node is only kept as a placeholder
}

function flattenTextNode(n, nodeCount, nodes, buffer) {
  var parentTag = upperCaseOrNull(n.parentNode.tagName);
  if (parentTag == 'SCRIPT' || parentTag == 'STYLE') {
    // content inside SCRIPT and STYLE tags should not be
    // matched by a TC pattern
    buffer.append(" ");
  } else {
    buffer.append(removeXmlChars(n.nodeValue));
  }
}


/**
    Takes a DOM object (nsIDOM3Document I believe) and creates a string of xml text.
    
    @param  dom             An HTMLDocument object to convert.
    @return                 A string representation of dom.
*/
function /*string*/ domToString(/*nsIDOM3Document*/ dom) {
    var serializer = Components.classes["@mozilla.org/xmlextras/xmlserializer;1"].
        createInstance(Components.interfaces.nsIDOMSerializer)
    return serializer.serializeToString(dom)
}

/// Simulating events to DOM nodes

/**
 * Takes a node and fires the appropriate mouse event on it via automation.
 * 
 * @param type is the name of the type of mouse event,
 *        such as: "mousedown", "mouseup", or "click"
 * @param node the Node that should receive the event
 * @return boolean indicating whether any of the listeners which handled the
 *         event called preventDefault. If preventDefault was called
 *         the value is false, else the value is true.
 */
function fireMouseEvent(/*string*/ type, /*Node*/ node) {
 
  // Mozilla spec for initMouseEvent:
  //   http://www.mozilla.org/docs/dom/domref/dom_event_ref29.html
  // JavaScript example of using initMouseEvent:
  //   http://www.adras.com/Fire-an-event-from-javascript.t69-50.html

  var doc = node.ownerDocument;
  var event = doc.createEvent("MouseEvents");
  event.initMouseEvent(type, // typeArg
    true, // canBubbleArg
    true, // cancelableArg
    doc.defaultView, // viewArg (type AbstractView)
    1, // detailArg (click count)
    0, // screenX
    0, // screenY
    0, // clientX
    0, // clientY
    false, // ctrlKeyArg
    false, // altKeyArg
    false, // shiftKeyArg
    false, // metaKeyArg
    0, // buttonArg (0: left, 1: middle, 2: right)
    null // relatedTargetArg
  );
  // http://www.xulplanet.com/references/objref/EventTarget.html#method_dispatchEvent
  if (instanceOf(doc, XULElement)) {return node.click()}
  else {return node.dispatchEvent(event);}
  //also execute a direct click() command to the node
  //just in case it is an xbl binding or anonymous content that doesn't
  //respond to node.dispatchEvent
}


/**
 * Fires a keyboard input event on a node via automation.
 * 
 * @param document the Document that should receive the event
 * @param keys an array of string representing the keys that are pressed
 * @param node the Node that should receive the event
 * @param fireKeyBoolean a boolean that decides whether to fire a keypress event or simply return an array
 *  of keypress data corresponding to the array of keys. keypress calls fireKeyEvent with true, while onKeypress calls it with false
 */
function fireKeyEvent(/*document*/ document, /*array*/ keys, /*Node*/ node, /*Boolean*/ fireKeyBoolean) {     
   
    var doc = document;
    if(node.ownerDocument != null){
        doc = node.ownerDocument
    }
    var ctrlKeyArg = false;
    var altKeyArg = false;
    var shiftKeyArg = false;
    var metaKeyArg = false;
    var charKey = 0;
    var keyCode = 0;
    var keyInfo = [];
    var allKeyInfo = [];
    for(var i=0; i<keys.length; i++){
        if(keys[i].length == 1){
            charKey = keys[i];
            keyInfo = returnKeyInfo();
        }
        else{
            keys[i] = keys[i].toLowerCase();
        }
            switch(keys[i]){
              case "ctrl":
                 ctrlKeyArg = true;
                 break
              case "control":
                 ctrlKeyArg = true;
                 break
              case "alt":
                 altKeyArg = true;
                 break
              case "shift":
                 shiftKeyArg = true;
                 break
              case "back":
                 keyCode = 8;
                 keyInfo = returnKeyInfo();
                 break
              case "backspace":
                 keyCode = 8;
                 keyInfo = returnKeyInfo();
                 break
              case "tab":
                 keyCode = 9;
                 keyInfo = returnKeyInfo()
                 break
              case "enter":
                 keyCode = 13;
                 keyInfo = returnKeyInfo()
                 break
              case "pause":
                 keyCode = 19;
                 keyInfo = returnKeyInfo()
                 break
              case "break":
                 keyCode = 19;
                 keyInfo = returnKeyInfo()
                 break
              case "caps":
                 keyCode = 20;
                 keyInfo = returnKeyInfo()
                 break
              case "capslock":
                 keyCode = 20;
                 keyInfo = returnKeyInfo()
                 break
              case "escape":
                 keyCode = 27;
                 keyInfo = returnKeyInfo()
                 break
              case "esc":
                 keyCode = 27;
                 keyInfo = returnKeyInfo()
                 break
              case "page-up":
                 keyCode = 33;
                 keyInfo = returnKeyInfo()
                 break
              case "pageup":
                 keyCode = 33;
                 keyInfo = returnKeyInfo()
                 break
              case "page-down":
                 keyCode = 34;
                 keyInfo = returnKeyInfo()
                 break
              case "pagedown":
                 keyCode = 34;
                 keyInfo = returnKeyInfo()
                 break
              case "end":
                 keyCode = 35;
                 keyInfo = returnKeyInfo()
                 break
              case "home":
                 keyCode = 36;
                 keyInfo = returnKeyInfo()
                 break
              case "left-arrow":
                 keyCode = 37;
                 keyInfo = returnKeyInfo()
                 break
              case "leftarrow":
                 keyCode = 37;
                 keyInfo = returnKeyInfo()
                 break
              case "up-arrow":
                 keyCode = 38;
                 keyInfo = returnKeyInfo()
                 break
              case "uparrow":
                 keyCode = 38;
                 keyInfo = returnKeyInfo()
                 break
              case "right-arrow":
                 keyCode = 39;
                 keyInfo = returnKeyInfo()
                 break
              case "rightarrow":
                 keyCode = 39;
                 keyInfo = returnKeyInfo()
                 break
              case "down-arrow":
                 keyCode = 40;
                 keyInfo = returnKeyInfo()
                 break
              case "downarrow":
                 keyCode = 40;
                 keyInfo = returnKeyInfo()
                 break
              case "insert":
                 keyCode = 45;
                 keyInfo = returnKeyInfo()
                 break
              case "del":
                 keyCode = 46;
                 keyInfo = returnKeyInfo();
                 break
              case "delete":
                 keyCode = 46;
                 keyInfo = returnKeyInfo();
                 break
              case "left-window":
                 keyCode = 91;
                 keyInfo = returnKeyInfo()
                 break
              case "leftwindow":
                 keyCode = 91;
                 keyInfo = returnKeyInfo()
                 break
              case "right-window":
                 keyCode = 92;
                 keyInfo = returnKeyInfo()
                 break
              case "rightwindow":
                 keyCode = 92;
                 keyInfo = returnKeyInfo()
                 break 
              case "select-key":
                 keyCode = 93;
                 keyInfo = returnKeyInfo();
                 break
              case "select":
                 keyCode = 93;
                 keyInfo = returnKeyInfo();
                 break
              case "f1":
                 keyCode = 112;
                 keyInfo = returnKeyInfo();
                 break 
              case "f2":
                 keyCode = 113;
                 keyInfo = returnKeyInfo();
                 break 
              case "f3":
                 keyCode = 114;
                 keyInfo = returnKeyInfo();
                 break 
              case "f4":
                 keyCode = 115;
                 keyInfo = returnKeyInfo();
                 break 
              case "f5":
                 keyCode = 116;
                 keyInfo = returnKeyInfo();
                 break 
              case "f6":
                 keyCode = 117;
                 keyInfo = returnKeyInfo();
                 break 
              case "f7":
                 keyCode = 118;
                 keyInfo = returnKeyInfo();
                 break 
              case "f8":
                 keyCode = 119;
                 keyInfo = returnKeyInfo();
                 break 
              case "f9":
                 keyCode = 120;
                 keyInfo = returnKeyInfo();
                 break 
              case "f10":
                 keyCode = 121;
                 keyInfo = returnKeyInfo();
                 break 
              case "f11":
                 keyCode = 122;
                 keyInfo = returnKeyInfo();
                 break 
              case "f12":
                 keyCode = 123;
                 keyInfo = returnKeyInfo();
                 break 
              case "num-lock":
                 keyCode = 144;
                 keyInfo = returnKeyInfo();
                 break 
              case "numlock":
                 keyCode = 144;
                 keyInfo = returnKeyInfo();
                 break 
              case "scroll-lock":
                 keyCode = 145;
                 keyInfo = returnKeyInfo();
                 break 
              case "scrolllock":
                 keyCode = 145;
                 keyInfo = returnKeyInfo();
                 break 
           }
           if(fireKeyBoolean == true && keyInfo.length != 0){
                 fireKey();
           }
           else if(keyInfo.length != 0){
                 allKeyInfo.push(keyInfo);
                 ctrlKeyArg = false;
                 altKeyArg = false;
                 shiftKeyArg = false;
                 metKeyArg = false;
                 charKey = 0;
                 keyCode = 0;
                 keyInfo = [];
          }
    }
    function returnKeyInfo(){
        var keyInfo = [];
        keyInfo[0] = ctrlKeyArg;
        keyInfo[1] = altKeyArg;
        keyInfo[2] = shiftKeyArg;
        keyInfo[3] = metaKeyArg;
        keyInfo[4] = keyCode;
        keyInfo[5] = charKey;
        if(keyInfo[5]){
              if(shiftKeyArg){
                    keyInfo[5] = keyInfo[5].toUpperCase();
              }
              keyInfo[5] = keyInfo[5].charCodeAt(0);
        }
        return keyInfo;
    }
    
    function fireKey(){
    
        function accessKeyElements(n) { 
             if(n.tagName=="A" || n.tagName=="INPUT" || n.tagName=="LABEL" || n.tagName=="TEXTAREA"){
        	     return NodeFilter.FILTER_ACCEPT
        	 }
             else{
                 return NodeFilter.FILTER_SKIP;
             }
         }

         if(keyInfo[1] == true){
             var elements = createTreeWalker(doc,NodeFilter.SHOW_ELEMENT,accessKeyElements,false);
             
             while (elements.nextNode()) {
                 if(elements.currentNode.accessKey && elements.currentNode.accessKey == String.fromCharCode(keyInfo[5])){
                     fireMouseEvent("click", elements.currentNode);
                     return;
                 }
             }
         }
            
         var event = doc.createEvent("KeyEvents");
         event.initKeyEvent("keypress", // typeArg
              false, // canBubbleArg
              true, // cancelableArg
              null, // viewArg (type AbstractView)
              keyInfo[0], // ctrlKeyArg
              keyInfo[1], // altKeyArg
              keyInfo[2], // shiftKeyArg
              keyInfo[3], // metaKeyArg
              keyInfo[4], // keyCodeArg
              keyInfo[5] // charCodeArg
         );
         ctrlKeyArg = false;
         altKeyArg = false;
         shiftKeyArg = false;
         metKeyArg = false;
         charKey = 0;
         keyCode = 0;
         keyInfo = [];
         return node.dispatchEvent(event);
    }
    
    return allKeyInfo;
}

/**
 * Fires a generic event (not a raw mouse or keyboard input event) via automation.
 * 
 * @param type is the name of the type of event, such as "change".
 * @param node the Node that should receive the event
 * @return boolean indicating whether any of the listeners which handled the
 *         event called preventDefault. If preventDefault was called
 *         the value is false, else the value is true.
 */

function fireEvent(/*String*/ type, /*Node*/ node) { 
  // Mozilla spec for events:
  //   http://developer.mozilla.org/en/docs/DOM:event
  var doc = node.ownerDocument;
  var event = doc.createEvent("HTMLEvents");
  event.initEvent(type, true, true);
  return node.dispatchEvent(event);
}

function fireUIEvent(/*String*/ type, /*Node*/ node) { 
  // Mozilla spec for events:
  //   http://developer.mozilla.org/en/docs/DOM:event
  var doc = node.ownerDocument;
  var event = doc.createEvent("UIEvents");
  event.initUIEvent(type, true, true, doc.defaultView, 1);
  return node.dispatchEvent(event);
}







goog.require('goog.dom');
goog.require('goog.style');

// Functions for fields (textboxes, buttons, checkboxes, radiobuttons, lists, etc.)
//
// Added conditions to extend existing fields to xul, and added menu and menuitem fields.

/**
 * Takes a node that is an input field
 * Returns a string with the text or null
 */
function extractTextFromField(/*Node*/node) {
  if (!node) return null;
  if (upperCaseOrNull(node.tagName) == 'BUTTON') {
    return node.textContent;
  } else if (isClickable(node) && 'value' in node) {
    return node.value;
  } else if (upperCaseOrNull(node.tagName) == 'SELECT') {
    var sb = new StringBuffer();
    var options = node.options;
    for (var i = 0; i < options.length; ++i) {
      sb.append(options[i].text + " ");
    }
    return sb.toString();
  }
  return null;
}

/**
 * Iterate through elements in a DOM that match a predicate.
 * (Simplified interface for constructing a TreeWalker.)
 * @param root Document to iterate; or Node to iterate a subtree
 * @param predicate  function:node->boolean selects which nodes to return.
 *    Good choices are isClickable, isTextbox, isCheckbox, isRadiobutton, isVisible, etc.
 * @return a TreeWalker; see treeWalker.js for examples of how to iterate it.
 */
function findElements(/*Document|Node*/ root, /*optional function*/ predicate) {
  if (instanceOf(root, Document)) {
    root = Pattern.getFindRoot(root);
  }
  var filter = 
    predicate ? function(node) { return predicate(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP; }
              : null;
  if ((instanceOf(root, XULElement)) || (instanceOf(root, XULDocument))) {
  //use a deepTreeWalker if a XUL Element or Document
    return createDeepTreeWalker(root, NodeFilter.SHOW_ELEMENT, predicate, true);
    }
    //use a normal treeWalker if an HTML document
  else {return createTreeWalker(root, NodeFilter.SHOW_ELEMENT, filter);}
 }

/** @return true if the node is visible on the page */
function isVisible(/*Node*/ node) {
  if (isMenuItem(node)) {return isVisible(node.parentNode);}
  if (node.tagName == 'menupopup') {
    if (node.parentNode.open == true) {return true;}
    else if (node.parentNode.wrappedJSObject && node.parentNode.wrappedJSObject.open == true) {
      return true;}
    else {return false;}}

  if (node.nodeType == Node.TEXT_NODE) node = node.parentNode; 
  if (upperCaseOrNull(node.tagName) in isVisible.INVISIBLE_TAGS) return false;
  
  var doc = node.ownerDocument
  if (doc.wrappedJSObject) {doc = doc.wrappedJSObject;}
  if (doc.firstChild.tagName && doc.firstChild.tagName == 'prefwindow') {
    return ((node.getAttribute("pane")) ||
        goog.dom.contains(doc.firstChild.currentPane, node));
  }

  // this isn't reliable -- e.g., the links to result pages (and even the Next link) on Google search
  // results have 0-width and 0-height box.
  var box = Box.forNode(node);
  if (!box.width && !box.height && !box.x && !box.y) return false;
  
  //this is only reliable in xul, so far
  if ((instanceOf(node.ownerDocument, XULElement))
      && node.boxObject
      && node.boxObject.height == 0
      && node.boxObject.width == 0) {return false;}
  
  // this is unfortunately slow
  return goog.style.getComputedStyle(node, 'visibility') == 'visible';
}


// DEPRECATED: on FF 3.6, inVisibleFrame() generates security exceptions for
// frames that are from a different domain than their parent.  The errors seem
// to be caused by moving upward, from node (in domain A) to frame to frameElement (from domain B), 
// and then asking for the width of frameElement.  But it seems to be OK to traverse downward,
// so instead we do the visibility check in getAllVisibleFrameDocuments(). 
//
// /** @return true if the node is in a frame that is visible */
// function inVisibleFrame(/*Node|Document*/ node) {
//  var nodeFrame = (node.ownerDocument ? node.ownerDocument : node).defaultView;
//
//  nodeFrame = nodeFrame.wrappedJSObject || nodeFrame;
//  // if no frameElement, then not in an IFRAME
//  var frameElement;
//  if (!(frameElement = nodeFrame.frameElement)) return true;
//  frameElement = frameElement.wrappedJSObject || frameElement;
//  // frameElement is a FRAME or an IFRAME
//  // oftentimes, an IFRAME is enclosed by a DIV
//  // (I can't remember why -- it may have to do with how IE6 handles them)
//  // So we test that both the IFRAME and its parent have a nonzero Box
//  return Box.forNode(frameElement).width;
//}

isVisible.INVISIBLE_TAGS = {
  HEAD : 1,
  SCRIPT : 1,
  STYLE : 1,
  NOSCRIPT : 1,
};

/** @return true iff node is a clickable button */
function isClickable(/*Node*/ node) {
  return instanceOf(node, Node)
    && node.nodeType == Node.ELEMENT_NODE 
    && (upperCaseOrNull(node.tagName) == 'BUTTON'
        || (node.tagName == 'button')
        || (node.tagName == 'toolbarbutton')
        || (node.tagName == 'xul:toolbarbutton')
        || (node.tagName == 'xul:button')
        || (upperCaseOrNull(node.tagName) == 'INPUT'
            && 'type' in node
            && (node.type == 'submit'
                || node.type == 'button'
                || node.type == 'reset'
                || node.type == 'image')));
}


/** @return true iff node is a hyperlink  */
function isLink(/*Node*/ node) {
  return instanceOf(node, Node)
    && node.nodeType == Node.ELEMENT_NODE 
    && ((upperCaseOrNull(node.tagName) == 'A'
          && (node.hasAttribute('href') || node.hasAttribute('onclick')))
        || node.className == 'text-link');
}

/**
 * A text input is a <TEXTAREA>
 * or <INPUT type="text|password">
 *
 * @return true if the node is a text input
 */
function isTextbox(/*Node*/ node) {
  if (!instanceOf(node, Node)) return false;
  if (node.tagName == 'textbox') return true;
  if (upperCaseOrNull(node.tagName) == 'TEXTAREA') return true;
  if (node.tagName == 'xul:textbox') return true;
  if (node.className == 'text-input') return true;
  if ('type' in node && upperCaseOrNull(node.tagName) == 'INPUT') {
    var type = node.type;
    if (type == 'text'
        || type == 'password'
        || type == 'file') {
      return true;
    }
  }
  return false;
}


/**
 * A listbox is a
 * <SELECT> element.
 *
 * @return true if the node is a pickable input
 */
function isListbox(/*<Node>*/ node) {
  if (!instanceOf(node, Node)) return false;
  return ((upperCaseOrNull(node.tagName) == 'SELECT') 
         || (node.tagName == 'menulist')
         || (node.tagName == 'listbox'));
}

function isCheckbox(node) {
  if (!instanceOf(node, Node)) return false;
  return ((upperCaseOrNull(node.tagName) == 'INPUT' && node.type == 'checkbox') || (node.tagName == 'checkbox'));
}

function isRadioButton(node) {
  if (!instanceOf(node, Node)) return false;
  return ((upperCaseOrNull(node.tagName) == 'INPUT' && node.type == 'radio') || (node.tagName == 'radio'));
}

function isListitem(/*Node*/ node) {
    if (!instanceOf(node, Node)) return false;
    return ((upperCaseOrNull(node.tagName) == 'OPTION')
           || (upperCaseOrNull(node.tagName) == 'INPUT' && node.type == 'option')
           || (node.tagName == 'menuitem')
           || (node.tagName == 'listitem'));
}

function isMenu(/*Node*/ node) {
    if (!instanceOf(node, Node)) return false;
    return (node.tagName == 'menu');
}

function isMenuItem(/*Node*/ node) {
    if (!instanceOf(node, Node)) return false;
    return (node.tagName == 'menuitem')
}

function isTab(/*Node*/ node) {
    if (!instanceOf(node, Node)) return false;
    return (node.tagName == 'tab' || node.tagName == 'xul:tab' || node.tagName == 'panelTab');
}

/**
 * Returns true iff node is an image element of reasonable size.
 */
function isSignificantImage(node) {
  if (!instanceOf(node, Node)) return false;
  return upperCaseOrNull(node.tagName) == 'IMG'
         && node.width > 1 && node.height > 1;
}

/**
 * If there are multiple forms in a page, then it
 * is possible for there to be multiple <input> elements
 * with the same name, so an array of Node objects
 * is returned rather than a single (possibly null) Node.
 *
 * The user may optionally pass the name of the <form>
 * to specify which <form> to look in for the <input>.
 *
 * @return Node[] (possibly empty)
 */
function getFormElements(/*<String>*/eleName, /*<String>*/ formName) {
  if (!eleName) return [];
  var forms;
  if (formName) {
    forms = [ this.doc.forms[formName] ];
  } else {
    forms = this.doc.forms;
  }
  nodes = [];
  for (var i = 0; i < forms.length; i++) {  
    for (var j = 0; j < forms[i].elements.length; j++) {
      if (getInputName(forms[i].elements[j]) == eleName) nodes.push(forms[i].elements[j]);
    }
  }
  return nodes;
}

function getInputName(/*Node*/ node) {
  if (!node) {
    return null;
  } else if (node.type == 'radio') {
    return node.value;
  } else {
    return node.name;
  }
}

/**
 * Get all documents in a DOM, including its frames, 
 * but only frames that are visible (nonzero width).
 *
 * @param doc Document to iterate
 * @return Document[] = [doc, f1,f2,...,fn] where doc is the parameter
 *     and fi are the documents of all FRAME and IFRAME elements in doc
 *     and any other fi.
 */
function getAllVisibleFrameDocuments(/*Document*/ doc) {
  var docs = [];
  traverseDoc(doc);
  return docs;
  
  function traverseDoc(/*Document*/ doc) {
    if (!doc) return;
    docs.push(doc);
    traverseFrames(doc.getElementsByTagName("frame"));
    traverseFrames(doc.getElementsByTagName("iframe"));
  }
  function traverseFrames(/*FrameNode[]*/ frames) {
    for (var i = 0; i < frames.length; ++i) {
      
      traverseDoc(frames[i].contentDocument);
    }
  }
}

/** Utilities for Range objects.
 */

/** Create a Range that spans a Node.
 */
function nodeToRange(/*Node*/ node) {
    var doc = node.ownerDocument;
    //will throw an error if node is anonymous content AND
    //the node's parent doesn't know about its existence.
    //some anonymous nodes' parents do know about their
    //child's existence, but not all, and this is impossible
    //to determine just by looking at the page
    try {
      var index = getChildIndex(node);
      var range = doc.createRange();
      range.setStart(node.parentNode, index);
      range.setEnd(node.parentNode, index + 1);}
      //so catch the error and return the range for the nearest
      //binding up the DOM tree, for which a range can be defined
      //do this recursively until a valid range is defined
      catch(err) {nodeToRange(doc.getBindingParent(node));}
    return range;
}

/** Get the index of a node in its parent.
 *  Returns i such that node.parentNode.childNodes[i] == node.
 */
function getChildIndex(/*Node*/node) {
  var children = node.parentNode.childNodes;
  var index = -1;
  for (var i = 0; i < children.length; i++) {
    if (children.item(i) == node) {
      index = i;
      break;
    }
  }
  if (index < 0) throw new Error("node not found in parent");
  return index;
}


/**
 * Test whether a Range contains (all of) a Node.
 * (If you just want to test for intersection with
 * any part of the node, use range.intersectsNode(node)).
 */
function isNodeInRange(/*Node*/ node, /*Range*/ range) {
  var parent = node.parentNode;
  var offset = getChildIndex(node);
  return range.isPointInRange(parent, offset) && range.isPointInRange(parent, offset+1);
}


/**
 * Get the single element represented by a range, which could be either an
 * inner element (the range completely covers the element) or an outer
 * element (the range completely covers all the element's children).
 * If both inner and outer elements are found, the inner element is returned.
 * @param range Range
 * @returns If range = [<elem>...</elem>], returns elem;
 *          otherwise if range = <elem>[...]</elem>, returns elem;
 *          otherwise returns null.
 *
 *  Examples (where [ ] delimits the range):
 *       <A>[<B>x</B><C></C>]</A>  => A element
 *       <A>[<B>x</B>]<C></C></A>  => B element
 *       <A><B>[x]</B><C></C></A>  => B element
 *       <A><B>[x</B><C>]</C></A>  => null
 *       <A><B>[x</B>]<C></C></A>  => null
 */
function rangeToElement(/*Node*/range) {
  if (!range) return null;
  
  var startContainer = range.startContainer;
  var startOffset = range.startOffset;
  if (startContainer.nodeType == Node.TEXT_NODE) {
    // move startpoint from <A>[text...  to [<A>text...
    if (startOffset > 0) return null; // no outer element, there's text in the way
    startOffset = getChildIndex(startContainer);
    startContainer = startContainer.parentNode;
  }
  
  var endContainer = range.endContainer;
  var endOffset = range.endOffset;
  if (endContainer.nodeType == Node.TEXT_NODE) {
    // move endpoint from text...]</A>  to text...</A>]
    if (endOffset < endContainer.nodeValue.length) return null; // no outer element, there's text in the way
    endOffset = getChildIndex(endContainer) + 1;
    endContainer = endContainer.parentNode;
  }

  if (startContainer !== endContainer) return null;
  
  // inner element case: [<a>...</a>]
  if (endOffset - startOffset == 1) {
    var node = startContainer.childNodes[startOffset];
    if (node.nodeType == Node.ELEMENT_NODE)
      return node;
  }
  
  // outer element case: <a>[...]</a>
  if (startOffset == 0 && endOffset == startContainer.childNodes.length) {
    return startContainer;
  }

  // otherwise, no such element
  return null;
}

/**
 * Get the smallest single node that contains the given range.
 * Doesn't have to be an element.
 */
function rangeToContainer(/*Node*/range) {
  // first try rangeToElement, since it's usually smaller
  // than commonAncestorContainer
  var element = rangeToElement(range);
  if (element) return element;
  else return range.commonAncestorContainer;
}


/**
 * Take two nodes and figure out how far
 * each is from its least common ancestor
 */
function nodeDistance(n1, n2) {
  n1set = new SlickSet();
  n2set = new SlickSet();
  n1set.add(n1);
  n2set.add(n2);
  while (n1 || n2) {
    if (n1set.contains(n2)) break;
    if (n2set.contains(n1)) break;
    n1 = (n1) ? n1.parentNode : n1;
    n2 = (n2) ? n2.parentNode : n2;
    if (n1) n1set.add(n1);
    if (n2) n2set.add(n2);
  }
  score = n1set.size() + n2set.size();
  n1set.clear();
  n2set.clear();
  return score;
}

/**
 * createTreeWalker()
 *    Creates a TreeWalker that filters a subtree of the DOM.
 *
 * createTreeWalker(root, whatToShow, [acceptNode], [expandEntityReferences])
 *
 * Parameters:
 *   root
 *     DOM node, root of subtree to be walked
 *
 *   whatToShow 
 *     node types that should be returned by the TreeWalker, OR'ed together:
 *       NodeFilter.SHOW_ELEMENT
 *       NodeFilter.SHOW_TEXT
 *       NodeFilter.SHOW_ATTRIBUTE
 *       NodeFilter.SHOW_COMMENT
 *       NodeFilter.SHOW_ALL (for all DOM nodes)
 *
 *   acceptNode     
 *     optional user-defined filter function of type 
 *     DOMNode -> oneof(NodeFilter.FILTER_ACCEPT, NodeFilter.FILTER_SKIP, NodeFilter.FILTER_REJECT)
 *     Nodes that pass the whatToShow filter are passed to this acceptNode function.
 *     acceptNode may return one of three values:
 *       FILTER_ACCEPT to make the TreeWalker return the node
 *       FILTER_SKIP to make TreeWalker skip the node, but still consider its children
 *       FILTER_REJECT to make TreeWalker skip the node AND all its descendents
 *  expandEntityReferences
 *    optional boolean flag, not used in HTML
 *
 */

/**********************************************
 * Examples of createTreeWalker
 *
    // get all text nodes inside first link in document 
    var walker = createTreeWalker(document.links[0], NodeFilter.SHOW_TEXT);
 
    // find all images in document
    var walker = createTreeWalker
        (document,
         NodeFilter.SHOW_ELEMENT, 
         function(node) { 
           return (node.tagName=="img") 
             ? NodeFilter.FILTER_ACCEPT
             : NodeFilter.FILTER_SKIP;
         });
         
 
 ************************************************
 * Patterns for iterating over the resulting TreeWalker:
 *
   // Process nodes in filtered subtree 
   // (EXCLUDING the subtree root):
   while ((node = walker.nextNode()) != null) {
     ... use node here
   }

   // Same as above, but avoids a temp variable:
   while (walker.nextNode()) {
     ... use walker.currentNode here
   }
   
   // Process the root of the subtree 
   // as well as its descendents:
   // (This includes the root node even if it does not satisfy the filter.)
   do {
     ... use walker.currentNode here
   } while (walker.nextNode());
      
   // Process the filtered tree recursively:
   function recursive_algorithm(walker) {
     ... use walker.currentNode here if you want to
         process the root of the subtree + descendents
     
     if (walker.firstChild()) {
       do {
         ... use walker.currentNode here to skip the root
              and handle only the filtered descendents
         recursive_algorithm(walker);
       } while (tw.nextSibling());
       tw.parentNode();
     }
  }

* See http://www.mozilla.org/docs/dom/samples/treewalkerdemo.xml
* for more examples of using TreeWalker recursively
*********************************************/


// createTreeWalker works around a bug in Firefox.
//
//   When the whatToShow filter fails to match any of the descendents of the root,
//   Firefox's TreeWalker returns nodes *after* the root (outside the
//   root's subtree), instead of simply returning no nodes at all.
//   
//   We work around this bug by wrapping the TreeWalker with a wrapper that checks
//   the first valid node returned (by any of TreeWalker's methods) to make sure it's
//   in the root's subtree.  If it is, then we don't have to check any of the other
//   nodes returned by the TreeWalker, so we pay for this check only on the first node.
//   If it isn't, then we return null (no nodes).
//
function createTreeWalker(node, whatToShow, acceptNode, expandEntityReferences) {
  // acceptNode and expandEntityReferences are optional
  if (acceptNode === undefined) {
    acceptNode = null;
  }
  if (expandEntityReferences === undefined) {
    expandEntityReferences = false;
  }
  
  if (instanceOf(node, Document)) {
    node = node.documentElement;
  }
  var doc = node.ownerDocument;
  var walker = doc.createTreeWalker(node, whatToShow, acceptNode, expandEntityReferences);
  var wrapper = new TreeWalkerWrapper(walker);
  return wrapper;
}

function TreeWalkerWrapper(walker) {
  this.walker = walker;
  this.root = walker.root;
  this.whatToShow = walker.whatToShow;
  this.acceptNode = walker.acceptNode;
  this.expandEntityReferences = walker.expandEntityReferences;
  this.currentNode = walker.currentNode;
  this.alreadyChecked = false;
}

TreeWalkerWrapper.prototype.check = function(node) {
  if (!node) {
    //debug("check: node is null");
    return node;
  } else if (this.alreadyChecked) {
    //debug("check: already safe");
    return (this.currentNode = node);
  } else if (!this.isAncestorOf(this.root, node)) {
    //debug("check: caught bug, returning null");
    return null;
  } else {
    //debug("check: checked ancestry, safe");
    this.alreadyChecked = true;
    return (this.currentNode = node);
  }
}

TreeWalkerWrapper.prototype.isAncestorOf = function(ancestor, node) {
  while (node) {
    if (node === ancestor) {
      return true;
    } else {
      node = node.parentNode;
    }
  }
  return false;
}

TreeWalkerWrapper.prototype.firstChild = function() {
  return this.check(this.walker.firstChild());
}
TreeWalkerWrapper.prototype.lastChild = function() {
  return this.check(this.walker.lastChild());
}
TreeWalkerWrapper.prototype.nextNode = function() {
  return this.check(this.walker.nextNode());
}
TreeWalkerWrapper.prototype.nextSibling = function() {
  return this.check(this.walker.nextSibling());
}
TreeWalkerWrapper.prototype.parentNode = function() {
  return this.check(this.walker.parentNode());
}
TreeWalkerWrapper.prototype.previousNode = function() {
  return this.check(this.walker.previousNode());
}
TreeWalkerWrapper.prototype.previousSibling = function() {
  return this.check(this.walker.previousSibling());
}

//
// Tests.
//

/*
// Run this test on a page whose first link is simple text.
var link = document.links[0];
var walker = createTreeWalker(link, NodeFilter.SHOW_ELEMENT);
var node = walker.nextNode();
if (node != null && node.parentNode !== link) {
  alert("Test failed: TreeWalker returned an element outside the root's subtree");
}
*/

/*
 * Chrome object, representing a firefox/chrome window.
 * This object delegates most of its properties and methods to
 * the Window object inside it, but also provides Chickenfoot commands
 * like click, enter, and find.  Returned by Chrome().
 */
function Chrome(/*chromeWindow*/ cwin) {
this._window=cwin;
}


Chrome.prototype.toString = function() { 
  return "[object Chrome]"; 
};

Chrome.prototype.document getter = function() { 
  return this._window.document; }
  
Chrome.prototype.window getter = function getWindow() { return this._window; }
Chrome.prototype.go = function go(url, reload) { goImpl(this._window, url, reload); }
Chrome.prototype.reload = function reload() { this._window.location.reload(); };
Chrome.prototype.find = function find(pattern) { return Pattern.find(this.document, pattern); }
Chrome.prototype.click = function click(pattern) { clickImpl(this.document, pattern); }
Chrome.prototype.keypress = function keypress(keySequence, destination) { keypressImpl(this.document, keySequence, destination); }
Chrome.prototype.enter = function enter(pattern,value) { enterImpl(this.document, pattern,value); }
Chrome.prototype.reset = function reset(pattern) { resetImpl(this.document, pattern); }
Chrome.prototype.pick = function pick(listPattern, choicePattern, checked) { pickImpl(this.document, arguments); }
Chrome.prototype.unpick = function unpick(listPattern,choicePattern, checked) { unpickImpl(this.document, arguments); }
Chrome.prototype.check = function check(pattern) { checkImpl(this.document, pattern); }
Chrome.prototype.uncheck = function uncheck(pattern) { uncheckImpl(this.document, pattern); }
Chrome.prototype.insert = function insert(pattern,chunk) { return insertImpl(this.document, pattern,chunk); }
Chrome.prototype.remove = function remove(pattern) { return removeImpl(this.document, pattern); }
Chrome.prototype.replace = function replace(pattern,chunk) { return replaceImpl(this.document, pattern,chunk); }
Chrome.prototype.before = function before(pattern) { return beforeImpl(this.document, pattern); }
Chrome.prototype.after = function after(pattern) { return afterImpl(this.document, pattern); }
Chrome.prototype.onClick = function onClick(pattern,handler) { return onClickImpl(this.document, pattern,handler); }
Chrome.prototype.onKeypress = function onKeypress(pattern,handler,destination) { return onKeypressImpl(this.document, pattern, handler, destination); }

/*
 * Delegators for Window properties. 
 * FIX: this is unmaintainable; can easily drift from Firefox's Window
 * interface.  Instead, figure out at runtime what
 * properties Windows have, and forward them automatically.
 */

// methods of window
Chrome.prototype.addEventListener = function() { return this._window.addEventListener.apply(this._window, arguments); }
Chrome.prototype.alert = function() { return this._window.alert.apply(this._window, arguments); }
Chrome.prototype.atob = function() { return this._window.atob.apply(this._window, arguments); }
Chrome.prototype.back = function() { return this._window.back.apply(this._window, arguments); }
Chrome.prototype.blur = function() { return this._window.blur.apply(this._window, arguments); }
Chrome.prototype.btoa = function() { return this._window.btoa.apply(this._window, arguments); }
Chrome.prototype.captureEvents = function() { return this._window.captureEvents.apply(this._window, arguments); }
Chrome.prototype.clearInterval = function() { return this._window.clearInterval.apply(this._window, arguments); }
Chrome.prototype.clearTimeout = function() { return this._window.clearTimeout.apply(this._window, arguments); }
Chrome.prototype.close = function() { return this._window.close.apply(this._window, arguments); }
Chrome.prototype.confirm = function() { return this._window.confirm.apply(this._window, arguments); }
Chrome.prototype.disableExternalCapture = function() { return this._window.disableExternalCapture.apply(this._window, arguments); }
Chrome.prototype.dispatchEvent = function() { return this._window.dispatchEvent.apply(this._window, arguments); }
Chrome.prototype.dump = function() { return this._window.dump.apply(this._window, arguments); }
Chrome.prototype.enableExternalCapture = function() { return this._window.enableExternalCapture.apply(this._window, arguments); }
Chrome.prototype.focus = function() { return this._window.focus.apply(this._window, arguments); }
Chrome.prototype.forward = function() { return this._window.forward.apply(this._window, arguments); }
Chrome.prototype.getComputedStyle = function() { return this._window.getComputedStyle.apply(this._window, arguments); }
Chrome.prototype.getSelection = function() { return this._window.getSelection.apply(this._window, arguments); }
Chrome.prototype.history = function() { return this._window.history.apply(this._window, arguments); }
Chrome.prototype.home = function() { return this._window.home.apply(this._window, arguments); }
Chrome.prototype.moveBy = function() { return this._window.moveBy.apply(this._window, arguments); }
Chrome.prototype.moveTo = function() { return this._window.moveTo.apply(this._window, arguments); }
Chrome.prototype.open = function() { return this._window.open.apply(this._window, arguments); }
Chrome.prototype.openDialog = function() { return this._window.openDialog.apply(this._window, arguments); }
Chrome.prototype.print = function() { return this._window.print.apply(this._window, arguments); }
Chrome.prototype.prompt = function() { return this._window.prompt.apply(this._window, arguments); }
Chrome.prototype.releaseEvents = function() { return this._window.releaseEvents.apply(this._window, arguments); }
Chrome.prototype.removeEventListener = function() { return this._window.removeEventListener.apply(this._window, arguments); }
Chrome.prototype.resizeBy = function() { return this._window.resizeBy.apply(this._window, arguments); }
Chrome.prototype.resizeTo = function() { return this._window.resizeTo.apply(this._window, arguments); }
Chrome.prototype.routeEvent = function() { return this._window.routeEvent.apply(this._window, arguments); }
Chrome.prototype.scroll = function() { return this._window.scroll.apply(this._window, arguments); }
Chrome.prototype.scrollBy = function() { return this._window.scrollBy.apply(this._window, arguments); }
Chrome.prototype.scrollByLines = function() { return this._window.scrollByLines.apply(this._window, arguments); }
Chrome.prototype.scrollByPages = function() { return this._window.scrollByPages.apply(this._window, arguments); }
Chrome.prototype.scrollMaxX = function() { return this._window.scrollMaxX.apply(this._window, arguments); }
Chrome.prototype.scrollMaxY = function() { return this._window.scrollMaxY.apply(this._window, arguments); }
Chrome.prototype.scrollTo = function() { return this._window.scrollTo.apply(this._window, arguments); }
Chrome.prototype.setInterval = function() { return this._window.setInterval.apply(this._window, arguments); }
Chrome.prototype.setResizable = function() { return this._window.setResizable.apply(this._window, arguments); }
Chrome.prototype.setTimeout = function() { return this._window.setTimeout.apply(this._window, arguments); }
Chrome.prototype.sizeToContent = function() { return this._window.sizeToContent.apply(this._window, arguments); }
Chrome.prototype.stop = function() { return this._window.stop.apply(this._window, arguments); }
Chrome.prototype.title = function() {return this._window.title;}
Chrome.prototype.updateCommands = function() { return this._window.updateCommands.apply(this._window, arguments); }

// properties of window
Chrome.prototype.closed getter = function() { return this._window.closed; }
Chrome.prototype.constructor getter = function() { return this._window.constructor; }
Chrome.prototype.content getter = function() { return this._window.content; }
Chrome.prototype.controllers getter = function() { return this._window.controllers; }
Chrome.prototype.crypto getter = function() { return this._window.crypto; }
Chrome.prototype.defaultStatus getter = function() { return this._window.defaultStatus; }
Chrome.prototype.directories getter = function() { return this._window.directories; }
Chrome.prototype.frameElement getter = function() { return this._window.frameElement; }
Chrome.prototype.frames getter = function() { return this._window.frames; }
Chrome.prototype.fullScreen getter = function() { return this._window.fullScreen; }
Chrome.prototype.innerHeight getter = function() { return this._window.innerHeight; }
Chrome.prototype.innerWidth getter = function() { return this._window.innerWidth; }
Chrome.prototype.length getter = function() { return this._window.length; }
Chrome.prototype.locationbar getter = function() { return this._window.locationbar; }
Chrome.prototype.menubar getter = function() { return this._window.menubar; }
Chrome.prototype.name getter = function() { return this._window.name; }
Chrome.prototype.navigator getter = function() { return this._window.navigator; }
Chrome.prototype.opener getter = function() { return this._window.opener; }
Chrome.prototype.outerHeight getter = function() { return this._window.outerHeight; }
Chrome.prototype.outerWidth getter = function() { return this._window.outerWidth; }
Chrome.prototype.pageXOffset getter = function() { return this._window.pageXOffset; }
Chrome.prototype.pageYOffset getter = function() { return this._window.pageYOffset; }
Chrome.prototype.parent getter = function() { return this._window.parent; }
Chrome.prototype.personalbar getter = function() { return this._window.personalbar; }
Chrome.prototype.pkcs11 getter = function() { return this._window.pkcs11; }
Chrome.prototype.screen getter = function() { return this._window.screen; }
Chrome.prototype.screenX getter = function() { return this._window.screenX; }
Chrome.prototype.screenY getter = function() { return this._window.screenY; }
Chrome.prototype.scrollbars getter = function() { return this._window.scrollbars; }
Chrome.prototype.scrollX getter = function() { return this._window.scrollX; }
Chrome.prototype.scrollY getter = function() { return this._window.scrollY; }
Chrome.prototype.self getter = function() { return this._window.self; }
Chrome.prototype.status getter = function() { return this._window.status; }
Chrome.prototype.statusbar getter = function() { return this._window.statusbar; }
Chrome.prototype.toolbar getter = function() { return this._window.toolbar; }
Chrome.prototype.top getter = function() { return this._window.top; }
/*
*  This implements the PasswordManagerInterface for the login-manager provided
*  by Firefox 3
*/

/*
* PasswordManagerInterface
* void addEntry(hostname, username, password, formSubmitURL, usernameField, passwordField)
** This method adds an entry into the passwordManager/loginManager.
*** @param hostname - String: the host website for which this password is being used
*** @param username - String: the username for this password manager entry
*** @param password - String: the password. This is the only field that is stored securely in the password/login manager
*** @param (semi-optional) formSubmitURL - String: Required for Firefox 3 and not required for previous versions.
***                                                Represents the url of the target location of the HTML login form for this entry
*** @param (optional) usernameField - String: Not required for FF2, optional for FF3. Represnts the username field name of the HTML login form 
*** @param (optional) usernameField - String: Not required for FF2, optional for FF3. Represnts the password field name of the HTML login form 
*
* void removeEntry(hostname, username)
** This method removes a password entry from the passwordManager/loginManager.
*** @param hostname - String: the host website for which this password is being used. This will be converted to a regular expression and matched against stored hostnames
*** @param username - String: the username for this password manager entry
*
* Entry retrieveEntry(hostname, username)
** This method retrieves an entry from the passwordManager/loginManager.
*** @param hostname - String: the host website for which this password is being used. This will be converted to a regular expression and matched against stored hostnames
*** @param (optional) username - String: the username for this password manager entry. If not supplied returns the first
*** @return : passwordEntry (object) - {String username, String Password}
*/

function LoginManager() {
}

LoginManager.addEntry = function(hostname, username, password, formSubmitURL, usernameField, passwordField) {
    var loginManager = Components.classes["@mozilla.org/login-manager;1"]
                           .getService(Components.interfaces.nsILoginManager);
    var nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1",
                                               Components.interfaces.nsILoginInfo,
                                               "init");	  
    var entry = new nsLoginInfo(hostname, formSubmitURL, null, username, password, usernameField, passwordField);
    loginManager.addLogin(entry);
}


LoginManager.removeEntry = function(hostname, username, formSubmitURL) {
  var host = new RegExp(hostname.replace(/([\^\$\.\*\+\?\=\!\:\|\\\/\(\)\[\]\{\}])/g, "\\$1"));  
     // Get Login Manager 
     var loginManager = Components.classes["@mozilla.org/login-manager;1"]
                           .getService(Components.interfaces.nsILoginManager);
   
     // Find users for this extension 
     var entries = loginManager.getAllLogins({});
        
     for (var i = 0; i < entries.length; i++) {
        if (entries[i].hostname.match(host)) {
           if(entries[i].username == username) {
             return loginManager.removeLogin(entries[i]);
           }
        }
     }
     throw new Error("Entry not found while removing entry from login manager: hostname=" + hostname + ", username=" + username);
}

LoginManager.retrieveEntry = function(hostname, username) {
     var retrievedEntry = {};
     
     // convert strings into regexes
     var host = new RegExp(hostname.replace(/([\^\$\.\*\+\?\=\!\:\|\\\/\(\)\[\]\{\}])/g, "\\$1"));  
     // Get Login Manager 
     var loginManager = Components.classes["@mozilla.org/login-manager;1"]
                           .getService(Components.interfaces.nsILoginManager);
   
     // Find users for this extension 
     var entries = loginManager.getAllLogins({});
        
     for (var i = 0; i < entries.length; i++) {
        if (entries[i].hostname.match(host)) {
          if(username) {
            //if username specified check against it
            if(entries[i].username == username) {
              retrievedEntry.username = entries[i].username;
              retrievedEntry.password = entries[i].password;
              return retrievedEntry;
            }
          }
          else {
            //if no username specified, just return first one in list for the hostname
            retrievedEntry.username = entries[i].username;
            retrievedEntry.password = entries[i].password;
            return retrievedEntry;
          }
        }
     }
     return null;
}


/* Test cases
var p = new LoginManager();
p.addEntry('http://www.facebook.com/', 'prannay@mit.edu', 'abc');
p.addEntry('http://www.facebook.com/', 'jaja_binx@mit.edu', 'blurb', null, 'email', 'pass');
output(p.retrieveEntry('www.facebook.com', 'prannay@mit.edu'));
output(p.retrieveEntry('www.facebook.com'));
*/
/*
*  This implements the PasswordManagerInterface for the password manager
*  implemented in Firefox 2.X.X and below.
*/

/*
* PasswordManagerInterface
* void addEntry(hostname, username, password, formSubmitURL, usernameField, passwordField)
** This method adds an entry into the passwordManager/loginManager.
*** @param hostname - String: the host website for which this password is being used
*** @param username - String: the username for this password manager entry
*** @param password - String: the password. This is the only field that is stored securely in the password/login manager
*** @param (semi-optional) formSubmitURL - String: Required for Firefox 3 and not required for previous versions.
***                                                Represents the url of the target location of the HTML login form for this entry
*** @param (optional) usernameField - String: Not required for FF2, optional for FF3. Represnts the username field name of the HTML login form 
*** @param (optional) usernameField - String: Not required for FF2, optional for FF3. Represnts the password field name of the HTML login form 
*
* void removeEntry(hostname, username)
** This method removes a password entry from the passwordManager/loginManager.
*** @param hostname - String: the host website for which this password is being used. This will be converted to a regular expression and matched against stored hostnames
*** @param username - String: the username for this password manager entry
*
* Entry retrieveEntry(hostname, username)
** This method retrieves an entry from the passwordManager/loginManager.
*** @param hostname - String: the host website for which this password is being used. This will be converted to a regular expression and matched against stored hostnames
*** @param (optional) username - String: the username for this password manager entry. If not supplied returns the first
*** @return : passwordEntry (object) - {String username, String Password}
*/

function PasswordManager() {
}

PasswordManager.addEntry = function(hostname, username, password, formSubmitURL, usernameField, passwordField) {
    var passwordManager = Components.classes["@mozilla.org/passwordmanager;1"]
                                  .getService(Components.interfaces.nsIPasswordManagerInternal);
    passwordManager.addUserFull(hostname, username, password, usernameField, passwordField);
}


PasswordManager.removeEntry = function(hostname, username) {
  // convert strings into regexes
  var host = new RegExp(hostname.replace(/([\^\$\.\*\+\?\=\!\:\|\\\/\(\)\[\]\{\}])/g, "\\$1"));  
  var passwordManager = Components.classes["@mozilla.org/passwordmanager;1"]
                                .getService(Components.interfaces.nsIPasswordManager);
  var e = passwordManager.enumerator;
  // step through each password in the password manager until we find the one we want:
  while (e.hasMoreElements()) {
      // Use the nsIPassword interface for the password manager entry.
      // This contains the actual password...
      var entry = e.getNext().QueryInterface(Components.interfaces.nsIPassword);
      if (entry.host.match(host)) {
        if(username == entry.user) {
          return passwordManager.removeUser(entry.host, entry.user)
        }
      }
  }
  throw new Error("Entry not found while removing entry from password manager: hostname=" + hostname + ", username=" + username);
}

PasswordManager.retrieveEntry = function(hostname, username) {
  var retrievedEntry = {};
  
  // convert strings into regexes
  var host = new RegExp(hostname.replace(/([\^\$\.\*\+\?\=\!\:\|\\\/\(\)\[\]\{\}])/g, "\\$1"));  
  var passwordManager = Components.classes["@mozilla.org/passwordmanager;1"]
                                .getService(Components.interfaces.nsIPasswordManager);
  var e = passwordManager.enumerator;
  // step through each password in the password manager until we find the one we want:
  while (e.hasMoreElements()) {
      // Use the nsIPassword interface for the password manager entry.
      // This contains the actual password...
      var entry = e.getNext().QueryInterface(Components.interfaces.nsIPassword);
      if (entry.host.match(host)) {
        if(username) {
          // if a username was specified
          if(username == entry.user) {
            retrievedEntry.username = entry.user;
            retrievedEntry.password = entry.password;
            return retrievedEntry;
          }
        } else {
          //if no username was specified just return the first one found for the host
          retrievedEntry.username = entry.user;
          retrievedEntry.password = entry.password;
          return retrievedEntry;
        }
      }
  }
  return null; // not found
}

/* Test cases
var p = new PasswordManager();
p.addEntry('http://www.facebook.com/', 'prannay@mit.edu', 'abc');
p.addEntry('http://www.facebook.com/', 'jaja_binx@mit.edu', 'blurb', null, 'email', 'pass');
output(p.retrieveEntry('www.facebook.com', 'prannay@mit.edu'));
output(p.retrieveEntry('www.facebook.com'));
*/
/**
 * SidebarState wraps up the state of the Chickenfoot sidebar into a single
 * object so that it can be remembered on the main window while the
 * sidebar is closed.
 */

/**
 * SidebarState fields
 *
 *     preservedBuffers: PreservedBuffer[] 
 *           contents of the sidebar's buffers
 * 
 *     selectedPreservedBuffer: PreservedBuffer  
 *           buffer that was selected in the sidebar
 */
 
/**
 * Make an object encapsulating the current sidebar state.
 */
function SidebarState(/*SidebarWindow*/ sidebarWindow) {
  var buffers = sidebarWindow.getAllBuffers();
  var selectedBuffer = sidebarWindow.getSelectedBuffer();
  var preservedBuffers = [];
  for (var i = 0; i < buffers.length; ++i) {
    var buffer = buffers[i];
    var preservedBuffer = new PreservedBuffer(buffer);
    preservedBuffers.push(preservedBuffer);
    if (buffer == selectedBuffer) this.selectedPreservedBuffer = preservedBuffer;
  }
  //debug("selected was " + this.selectedPreservedBuffer);
  this.preservedBuffers = preservedBuffers;
}

/**
 * Restore the sidebar state into a new sidebar.
 */
SidebarState.prototype.restore = function(/*SidebarWindow*/ sidebarWindow) {
  var selectedBuffer = null;
  for (var i = 0; i < this.preservedBuffers.length; ++i) {
    var preservedBuffer = this.preservedBuffers[i];
    var buffer = preservedBuffer.unpickle(sidebarWindow);
    if (preservedBuffer == this.selectedPreservedBuffer) selectedBuffer = buffer;
  }

  if (selectedBuffer) {
    selectedBuffer.focus();
  }
}

/**
 * Test whether this state is dirty (i.e., some part of it still needs to be 
 * saved to disk).
 */
SidebarState.prototype.dirty getter = function() {
  for (var i = 0; i < this.preservedBuffers.length; ++i) {
    var preservedBuffer = this.preservedBuffers[i];
    if (preservedBuffer.dirty) return true;
  }
  return false;
}

/**
 * Override methods on the chrome window so that
 * sidebar state is saved when the sidebar closes
 * or the entire window closes.
 */
function saveSidebarOnClose(/*ChromeWindow*/ chromeWindow) {
  // override chromeWindow.toggleSidebar() so we can save the state of the Chickenfoot sidebar
  var oldToggleSidebar = chromeWindow.toggleSidebar;
  chromeWindow.toggleSidebar = function(name) {
    try {
      var sidebarWindow = getSidebarWindow(chromeWindow);
      if (sidebarWindow) saveSidebarState(chromeWindow, sidebarWindow);
    } catch (e) {
      debug(e);
    }
    return oldToggleSidebar(name);
  };

  // override chromeWindow.WindowIsClosing() so we can allow the user to save dirty state
  var oldWindowIsClosing = chromeWindow.WindowIsClosing;
  chromeWindow.WindowIsClosing = function() {
    try {
      var sidebarWindow = getSidebarWindow(chromeWindow);
    
      if (sidebarWindow) {
        // Chickenfoot sidebar is currently open, so just ask it to handle dirty state
        if (!sidebarWindow.windowIsClosing()) return false;
        
      } else if (chromeWindow.chickenfootSidebarState 
                 && chromeWindow.chickenfootSidebarState.dirty) {
        // Chickenfoot sidebar is closed, but its saved state is dirty.  
        // Need to open the Chickenfoot sidebar to deal with it.

        // If another sidebar is open, remember it so we can come back to
        // it after showing Chickenfoot.
        var prevSidebarCommand = chromeWindow.document.getElementById("sidebar-box").getAttribute("sidebarcommand");

        // register a load listener, since Chickenfoot sidebar won't load immediately.
        var sidebar = chromeWindow.document.getElementById("sidebar");
        sidebar.addEventListener("load", sidebarLoaded, true);

        // show Chickenfoot sidebar, so that it can handle the dirty state.
        chromeWindow.toggleSidebar('viewChickenfootSidebar');        

        // return failure for now (stopping the caller from closing the chrome window).
        // We'll resume closing in sidebarLoaded.
        return false;
      }
    } catch (e) {
      debug(e);
      //return false;
    }
    return oldWindowIsClosing();
    
    // once dirty Chickenfoot sidebar is loaded, resume closing
    function sidebarLoaded() {
      sidebar.removeEventListener("load", sidebarLoaded, true);      
      // defer a bit to make sure the sidebar's own load listeners are done
      chromeWindow.setTimeout(afterTimeout, 0);
    } // end of sidebarLoaded
  
    // sidebar is fully loaded, tell it to close  
    function afterTimeout() {
      //debug("loaded sidebar");
      var sidebarWindow = sidebar.contentWindow;
      if (!sidebarWindow.windowIsClosing()) return;
  
      // put back whatever sidebar was there before,
      // so Firefox remembers to bring it up the next time it loads
      chromeWindow.toggleSidebar(prevSidebarCommand);
  
      // resume closing
      if (oldWindowIsClosing()) chromeWindow.close();
    } // end of afterTimeout
    
  }; // end of WindowIsClosing
  
  
}

/**
 * Save sidebar into a SidebarState object on the chrome window.
 */
function saveSidebarState(/*ChromeWindow*/ chromeWindow,
                          /*SidebarWindow*/ sidebarWindow) {
  chromeWindow.chickenfootSidebarState = new SidebarState(sidebarWindow);
}

/**
 * Restore sidebar from a SidebarState object stored on the
 * chrome window.
 * @requires sidebarWindow is empty (has no buffers)
 * @returns true if saved SidebarState object found on chrome window;
 *          false if no sidebar state found.
 */
function restoreSidebarState(/*ChromeWindow*/ chromeWindow,
                             /*SidebarWindow*/ sidebarWindow) {
  if (sidebarWindow.getAllBuffers().length > 0) throw new Error("restoring to nonempty sidebar");
  if (!chromeWindow.chickenfootSidebarState) return false;
  chromeWindow.chickenfootSidebarState.restore(sidebarWindow);
  return true;
}


/**
 * PreservedBuffer represents an edit buffer for a closed sidebar.
 */
function PreservedBuffer(/*Buffer*/ buffer) {
  this.file = buffer.file;
  this.dirty = buffer.dirty;
  this.text = buffer.text;
}

PreservedBuffer.prototype.unpickle = function(/*SidebarWindow*/ sidebarWindow) {
  return new sidebarWindow.Buffer(this.file, 
                                  this.dirty,
                                  this.text);
}

/*
 * Tab object, representing a browser tab.
 * This object delegates most of its properties and methods to
 * the Window object inside it, but also provides Chickenfoot commands
 * like click, enter, and find.  Returned by tab, fetch(), and openTab().
 */
function Tab(/*HtmlWindow*/ win, 
             /*optional TabBrowser*/ tabBrowser, 
             /*optional XulTab*/ tab) {
  this._window = win;
  this._tabBrowser = tabBrowser;
  this._tab = tab;
}


Tab.prototype.toString = function() { 
  return "[object Tab]"; 
};

Tab.prototype.document getter = function() { 
  return getLoadedHtmlDocument(this._tab.ownerDocument.defaultView, this._window);
}
Tab.prototype.show = function() {
  if (!this._tab) {
    this._tab = getTab(this._window);
    this._tabBrowser = this._tab.parentNode.parentNode.parentNode.parentNode;
  }

  this._tab.setAttribute("collapsed", "false");
  this._tabBrowser.selectedTab = this._tab;
}
Tab.prototype.window getter = function getWindow() { return this._window; }
Tab.prototype.go = function go(url, reload) { goImpl(this._window, url, reload); }
Tab.prototype.reload = function reload() { this._window.location.reload(); };
Tab.prototype.find = function find(pattern) { return Pattern.find(this.document, pattern); }
Tab.prototype.click = function click(pattern) { clickImpl(this.document, pattern); }
Tab.prototype.enter = function enter(pattern,value) { enterImpl(this.document, pattern,value); }
Tab.prototype.reset = function reset(pattern) { resetImpl(this.document, pattern); }
Tab.prototype.pick = function pick(listPattern, choicePattern, checked) { pickImpl(this.document, arguments); }
Tab.prototype.keypress = function keypress(keySequence, destination) { keypressImpl(this.document, keySequence, destination); }
Tab.prototype.unpick = function unpick(listPattern,choicePattern, checked) { unpickImpl(this.document, arguments); }
Tab.prototype.check = function check(pattern) { checkImpl(this.document, pattern); }
Tab.prototype.uncheck = function uncheck(pattern) { uncheckImpl(this.document, pattern); }
Tab.prototype.insert = function insert(pattern,chunk) { return insertImpl(this.document, pattern,chunk); }
Tab.prototype.remove = function remove(pattern) { return removeImpl(this.document, pattern); }
Tab.prototype.replace = function replace(pattern,chunk) { return replaceImpl(this.document, pattern,chunk); }
Tab.prototype.before = function before(pattern) { return beforeImpl(this.document, pattern); }
Tab.prototype.after = function after(pattern) { return afterImpl(this.document, pattern); }
Tab.prototype.onClick = function onClick(pattern,handler) { return onClickImpl(this.document, pattern,handler); }
Tab.prototype.onKeypress = function onKeypress(pattern,handler, destination) { return onKeypressImpl(this.document, pattern,handler, destination); }
//Tab.prototype.savePage = function savePage(saveLocationOrName) { return savePageImpl(this.document, saveLocationOrName); };
//Tab.prototype.savePageComplete = function savePageComplete(saveLocationOrName) { return savePageCompleteImpl(this.document, saveLocationOrName); };
//Tab.prototype.printPage = function printPage(printerName) { return printPageImpl(printerName); };

/*
 * Delegators for Window properties. 
 * FIX: this is unmaintainable; can easily drift from Firefox's Window
 * interface.  Instead, figure out at runtime what
 * properties Windows have, and forward them automatically.
 */

// methods of window
Tab.prototype.addEventListener = function() { return this._window.addEventListener.apply(this._window, arguments); }
Tab.prototype.alert = function() { return this._window.alert.apply(this._window, arguments); }
Tab.prototype.atob = function() { return this._window.atob.apply(this._window, arguments); }
Tab.prototype.back = function() { return this._window.back.apply(this._window, arguments); }
Tab.prototype.blur = function() { return this._window.blur.apply(this._window, arguments); }
Tab.prototype.btoa = function() { return this._window.btoa.apply(this._window, arguments); }
Tab.prototype.captureEvents = function() { return this._window.captureEvents.apply(this._window, arguments); }
Tab.prototype.clearInterval = function() { return this._window.clearInterval.apply(this._window, arguments); }
Tab.prototype.clearTimeout = function() { return this._window.clearTimeout.apply(this._window, arguments); }
Tab.prototype.close = function() { return this._window.close.apply(this._window, arguments); }
Tab.prototype.confirm = function() { return this._window.confirm.apply(this._window, arguments); }
Tab.prototype.disableExternalCapture = function() { return this._window.disableExternalCapture.apply(this._window, arguments); }
Tab.prototype.dispatchEvent = function() { return this._window.dispatchEvent.apply(this._window, arguments); }
Tab.prototype.dump = function() { return this._window.dump.apply(this._window, arguments); }
Tab.prototype.enableExternalCapture = function() { return this._window.enableExternalCapture.apply(this._window, arguments); }
Tab.prototype.focus = function() { return this._window.focus.apply(this._window, arguments); }
Tab.prototype.forward = function() { return this._window.forward.apply(this._window, arguments); }
Tab.prototype.getComputedStyle = function() { return this._window.getComputedStyle.apply(this._window, arguments); }
Tab.prototype.getSelection = function() { return this._window.getSelection.apply(this._window, arguments); }
Tab.prototype.history = function() { return this._window.history.apply(this._window, arguments); }
Tab.prototype.home = function() { return this._window.home.apply(this._window, arguments); }
Tab.prototype.moveBy = function() { return this._window.moveBy.apply(this._window, arguments); }
Tab.prototype.moveTo = function() { return this._window.moveTo.apply(this._window, arguments); }
Tab.prototype.open = function() { return this._window.open.apply(this._window, arguments); }
Tab.prototype.openDialog = function() { return this._window.openDialog.apply(this._window, arguments); }
Tab.prototype.print = function() { return this._window.print.apply(this._window, arguments); }
Tab.prototype.prompt = function() { return this._window.prompt.apply(this._window, arguments); }
Tab.prototype.releaseEvents = function() { return this._window.releaseEvents.apply(this._window, arguments); }
Tab.prototype.removeEventListener = function() { return this._window.removeEventListener.apply(this._window, arguments); }
Tab.prototype.resizeBy = function() { return this._window.resizeBy.apply(this._window, arguments); }
Tab.prototype.resizeTo = function() { return this._window.resizeTo.apply(this._window, arguments); }
Tab.prototype.routeEvent = function() { return this._window.routeEvent.apply(this._window, arguments); }
Tab.prototype.scroll = function() { return this._window.scroll.apply(this._window, arguments); }
Tab.prototype.scrollBy = function() { return this._window.scrollBy.apply(this._window, arguments); }
Tab.prototype.scrollByLines = function() { return this._window.scrollByLines.apply(this._window, arguments); }
Tab.prototype.scrollByPages = function() { return this._window.scrollByPages.apply(this._window, arguments); }
Tab.prototype.scrollMaxX = function() { return this._window.scrollMaxX.apply(this._window, arguments); }
Tab.prototype.scrollMaxY = function() { return this._window.scrollMaxY.apply(this._window, arguments); }
Tab.prototype.scrollTo = function() { return this._window.scrollTo.apply(this._window, arguments); }
Tab.prototype.setInterval = function() { return this._window.setInterval.apply(this._window, arguments); }
Tab.prototype.setResizable = function() { return this._window.setResizable.apply(this._window, arguments); }
Tab.prototype.setTimeout = function() { return this._window.setTimeout.apply(this._window, arguments); }
Tab.prototype.sizeToContent = function() { return this._window.sizeToContent.apply(this._window, arguments); }
Tab.prototype.stop = function() { return this._window.stop.apply(this._window, arguments); }
Tab.prototype.updateCommands = function() { return this._window.updateCommands.apply(this._window, arguments); }

// properties of window
Tab.prototype.closed getter = function() { return this._window.closed; }
Tab.prototype.constructor getter = function() { return this._window.constructor; }
Tab.prototype.content getter = function() { return this._window.content; }
Tab.prototype.controllers getter = function() { return this._window.controllers; }
Tab.prototype.crypto getter = function() { return this._window.crypto; }
Tab.prototype.defaultStatus getter = function() { return this._window.defaultStatus; }
Tab.prototype.directories getter = function() { return this._window.directories; }
Tab.prototype.frameElement getter = function() { return this._window.frameElement; }
Tab.prototype.frames getter = function() { return this._window.frames; }
Tab.prototype.fullScreen getter = function() { return this._window.fullScreen; }
Tab.prototype.innerHeight getter = function() { return this._window.innerHeight; }
Tab.prototype.innerWidth getter = function() { return this._window.innerWidth; }
Tab.prototype.length getter = function() { return this._window.length; }
Tab.prototype.locationbar getter = function() { return this._window.locationbar; }
Tab.prototype.menubar getter = function() { return this._window.menubar; }
Tab.prototype.name getter = function() { return this._window.name; }
Tab.prototype.navigator getter = function() { return this._window.navigator; }
Tab.prototype.opener getter = function() { return this._window.opener; }
Tab.prototype.outerHeight getter = function() { return this._window.outerHeight; }
Tab.prototype.outerWidth getter = function() { return this._window.outerWidth; }
Tab.prototype.pageXOffset getter = function() { return this._window.pageXOffset; }
Tab.prototype.pageYOffset getter = function() { return this._window.pageYOffset; }
Tab.prototype.parent getter = function() { return this._window.parent; }
Tab.prototype.personalbar getter = function() { return this._window.personalbar; }
Tab.prototype.pkcs11 getter = function() { return this._window.pkcs11; }
Tab.prototype.screen getter = function() { return this._window.screen; }
Tab.prototype.screenX getter = function() { return this._window.screenX; }
Tab.prototype.screenY getter = function() { return this._window.screenY; }
Tab.prototype.scrollbars getter = function() { return this._window.scrollbars; }
Tab.prototype.scrollX getter = function() { return this._window.scrollX; }
Tab.prototype.scrollY getter = function() { return this._window.scrollY; }
Tab.prototype.self getter = function() { return this._window.self; }
Tab.prototype.status getter = function() { return this._window.status; }
Tab.prototype.statusbar getter = function() { return this._window.statusbar; }
Tab.prototype.toolbar getter = function() { return this._window.toolbar; }
Tab.prototype.top getter = function() { return this._window.top; }

/**
 * returns the hash of the given string
 */
function hash(/*string*/ hashMe, /*optional string*/ algorithmName) {
  if (!algorithmName) {
    algorithmName = "SHA1";
  }

  var stringStream = Components.
    classes["@mozilla.org/io/string-input-stream;1"].
    createInstance(Components.interfaces.nsIStringInputStream);
  var hasher = Components.
    classes["@mozilla.org/security/hash;1"].
    getService(Components.interfaces.nsICryptoHash);
  // TODO(glittle): please document how this number was chosen;
  // is it random or is it significant?
  var PR_UINT32_MAX = 4294967295;
    
  stringStream.setData(hashMe, -1);
  hasher.initWithString(algorithmName);
  hasher.updateFromStream(stringStream, PR_UINT32_MAX);
  return hasher.finish(true);
}


localUrl_secretNumber = Math.random();

/**
 * creates a url that can access a local file despite Firefox's security protocol
 */
function localUrlImpl(/*string*/ url) {
  return "chicken-bypass-896b34a4-c83f-4ea7-8ef0-51ed7220ac94:" + 
    hash(url + localUrl_secretNumber).substring(0, 6) + ":" + url;
}

/*
* Checks whether nsIPasswordManager is available and uses it
* otherwise its Firefox 3, so use nsILoginManager
*/

function addPasswordImpl(hostname, username, password, formSubmitURL, usernameField, passwordField) {
  if ("@mozilla.org/passwordmanager;1" in Components.classes) {
    return PasswordManager.addEntry(hostname, username, password, formSubmitURL, usernameField, passwordField);
  }
  else if ("@mozilla.org/login-manager;1" in Components.classes) {
    return LoginManager.addEntry(hostname, username, password, formSubmitURL, usernameField, passwordField);
  }
}

function removePasswordImpl(hostname, username) {
  if ("@mozilla.org/passwordmanager;1" in Components.classes) {
    return PasswordManager.removeEntry(hostname, username);
  }
  else if ("@mozilla.org/login-manager;1" in Components.classes) {
    return LoginManager.removeEntry(hostname, username);
  }
}

function getPasswordImpl(hostname, username) {
  if ("@mozilla.org/passwordmanager;1" in Components.classes) {
    return PasswordManager.retrieveEntry(hostname, username);
  }
  else if ("@mozilla.org/login-manager;1" in Components.classes) {
    return LoginManager.retrieveEntry(hostname, username);
  }
}

var chickenfootPreferenceBranch;

/**
 * @return nsIPrefBranch2 object corresponding to "chickenfoot" branch in 
 * Firefox preferences
 */
function getPrefBranch() {
  if (!chickenfootPreferenceBranch) {
    chickenfootPreferenceBranch = 
           Components.classes["@mozilla.org/preferences-service;1"]
                .getService(Components.interfaces.nsIPrefService)
                .getBranch("chickenfoot.")
                .QueryInterface(Components.interfaces.nsIPrefBranch2);
  }
  return chickenfootPreferenceBranch;
}

/**
 * Test whether there are any preferences set in a branch.
 * Useful to see if the user has ever opened Chickenfoot sidebar.
 */
function hasPreferences(/*nsIPrefBranch*/ branch) {
  // getChildList() takes *output* parameters, which in the Javascript
  // are represented by an Object on which a value property is stored.
  var count = {};
  var children = {};
  branch.getChildList("", count, children);
  return count.value > 0;  
}

/**
 * Listen for changes to a preference.
 * @param branch nsIPrefBranch2 object
 * @param name name of preference to listen to
 * @param handler function called whenever preference changes
 *
 * e.g. addPreferenceListener(getPrefBranch(), "ignoreAllTriggers", function() {...} );
 */
function addPreferenceListener(/*nsIPrefBranch2*/ branch, /*String*/ name, /*function*/ handler) {
  observer = {observe: function(subject,topic,prefName) {
    handler();
  }};
  handler._observer = observer;
  branch.addObserver(name, observer, false);
}

/**
 * Stop listening for changes to a preference.
 * @param branch nsIPrefBranch object
 * @param name name of preference to listen to
 * @param handler function called whenever preference changes
 */
function removePreferenceListener(/*nsIPrefBranch2*/ branch, /*String*/ name, /*function*/ handler) {
  branch.removeObserver(name, handler._observer);
}

function printPageImpl(chromeWindow, /* String */ printerName){
	var utils = chromeWindow.PrintUtils;
	var wbp = utils.getWebBrowserPrint();
	var settings = utils.getPrintSettings();
	settings.printSilent = true
	if (arguments.length>1){
		settings.printerName=arguments[1];
 	}
	wbp.print(settings, null);
}


function savePageCompleteImpl(chromeWindow, doc, /* no agurments or String fileName or String relativePath or String fullpath or
		nsILocalFile relativePath or nsILocalFile fullpath*/ f){
//f is either a directory, a file name, a directory and filename or nothing
//determine which one

if(f instanceof Components.interfaces.nsILocalFile){
	if(Chickenfoot.SimpleIO.exists(f)){
		if(f.isDirectory()){
			savePageToDirectoryComplete(chromeWindow, doc, f);
		}else{
		if(f.isFile()){
			savePageToPathComplete(chromeWindow, doc, f);
		}else{
			//output('The valid is neither a file nor a directory, cannot save.');
		}
		}
	}else{
	//file does not exist
		savePageToPathComplete(chromeWindow,doc, f)
	}
}else{

//f is a String

if( Chickenfoot.SimpleIO.checkPathValidity(f)){
	//it is an attempt at a file or directory
	file=Chickenfoot.SimpleIO.toFile(f);
	if(Chickenfoot.SimpleIO.exists(file)){
	//file exists
		if(file.isDirectory()) {
			savePageToDirectoryComplete(chromeWindow, doc, file);
		}else{
			if(file.isFile()){
				savePageToPathComplete(chromeWindow, doc, file);
			}else{
				//output('bad syntax on file or directory')
			}
		}
	}else{
	//file does not exist user wants to save this as an exact path string
		savePageToPathComplete(chromeWindow, doc, file);
	}
}else{
	//it is not a file or directory
	if(f==null){
		savePageWithDefaultsComplete(chromeWindow, doc);
	}else{
	var filename=f;
		savePageToDefaultDirectoryWithFilenameComplete(chromeWindow, doc, filename);
	}
}
}
}

function savePageImpl(chromeWindow, doc, /* no arguments or String fileName or String relativePath or String fullpath or
		nsILocalFile relativePath or nsILocalFile fullpath*/ f){
//f is either a directory, a file name, a directory and filename or nothing
//determine which one

if(f instanceof Components.interfaces.nsILocalFile){
	if(Chickenfoot.SimpleIO.exists(f)){
		if(f.isDirectory()){
			savePageToDirectory(chromeWindow, doc, f);
		}else{
		if(f.isFile()){
			savePageToPath(chromeWindow, doc, f);
		}else{
			//output('The valid is neither a file nor a directory, cannot save.');
		}
		}
	}else{
	//file does not exist
		savePageToPath(chromeWindow, doc, f)
	}
}else{

//f is a String

if( Chickenfoot.SimpleIO.checkPathValidity(f)){
	//it is an attempt at a file or directory
	file=Chickenfoot.SimpleIO.toFile(f);

	if(Chickenfoot.SimpleIO.exists(file)){
	//file exists
		if(file.isDirectory()) {	
			savePageToDirectory(chromeWindow, doc, file);
		}else{
			if(file.isFile()){
				savePageToPath(chromeWindow, doc, file);
			}else{
				//output('bad syntax on file or directory')
			}
		}
	}else{
	//file does not exist user wants to save this as an exact path string
		savePageToPath(chromeWindow, doc, file);
	}
}else{
	//it is not a file or directory
	//output(doc);
	//output(f);
	if(f==null){
		//chromeWindow.alert('arg len ==1');
		savePageWithDefaults(chromeWindow, doc);
	}else{
		//alert('arg[1] '+arguments[1]);
		var filename=f;
		savePageToDefaultDirectoryWithFilename(chromeWindow, doc, filename);
	}
}
}
}



function makeFileFromParts(/* nsIFile */ directory, title, collisionCount, ext){
	fileText=title+"."+ext;
	if(collisionCount>0){
		fileText=title+"("+collisionCount+")."+ext;
	}
	directory.append(fileText)	
	return directory;
}

function savePageToDirectoryComplete(chromeWindow, doc, /* nsILocalFile */ dir){
	var pageTitle=doc.title;
	//rip out illegal file names!
	pageTitle= pageTitle.replace(':', "");
	var extension = "htm";
	var collisionCount = 0;
	var file=makeFileFromParts(dir, pageTitle, collisionCount, extension);
	while (file.exists()) {
		collisionCount++;
		file=makeFileFromParts(dir.parent, pageTitle, collisionCount, extension);
    }
	w=chromeWindow.makeWebBrowserPersist();
	var datapath=file.parent
	datapath.append(pageTitle+'_files');
	w.saveDocument(doc, file, datapath, null, 0,0);
//output(file);
}

function savePageToPathComplete(chromeWindow, doc, path){
	var file=path.leafName;
	file=file.replace(':', "");
	file= file.replace(/\.[^.]*$/, "")
	w=chromeWindow.makeWebBrowserPersist();
	var datapath=path.parent;
	datapath.append(file+'_files');
	w.saveDocument(doc, path, datapath, null, 0,0);
}

function savePageWithDefaultsComplete(chromeWindow, doc){
	var dir=Chickenfoot.SimpleIO.downloadDir();
	var pageTitle=doc.title;
	//rip out illegal file names!
	pageTitle= pageTitle.replace(':', "");
	var extension = "htm";
	var collisionCount = 0;
	var file=makeFileFromParts(dir, pageTitle, collisionCount, extension);
	//output(file);
	while (file.exists()) {
            collisionCount++;
			file=makeFileFromParts(dir.parent, pageTitle, collisionCount, extension);
    }
	var leafName=file.leafName;
	leafName= leafName.replace(/\.[^.]*$/, "")
	
	var datapath=file.parent;
	datapath.append(leafName+'_files');
	w=chromeWindow.makeWebBrowserPersist();
	w.saveDocument(doc, file, datapath, null, 0,0);

}

function savePageToDefaultDirectoryWithFilenameComplete(chromeWindow, doc, filename){
	var leafName=filename.replace(/\.[^.]*$/, "");
	leafName=leafName.replace(':', "");
	var file=Chickenfoot.SimpleIO.toFile(filename.replace(':', ""));	
	var datapath=file.parent
	datapath.append(leafName+'_files');
	w=chromeWindow.makeWebBrowserPersist();
	w.saveDocument(doc, file, datapath, null, 0,0);

}


//just save HTML helpers

function savePageToDirectory(chromeWindow, doc, /* nsILocalFile */ dir){
	var pageTitle=doc.title;
	//rip out illegal file names!
	pageTitle= pageTitle.replace(':', "");
	var extension = "htm";
	var collisionCount = 0;
	var file=makeFileFromParts(dir, pageTitle, collisionCount, extension);
	while (file.exists()) {
            	collisionCount++;
		file=makeFileFromParts(dir.parent, pageTitle, collisionCount, extension);
        }
	w=chromeWindow.makeWebBrowserPersist();
	w.saveDocument(doc, file, null, null, 0,0);
}

function savePageToPath(chromeWindow, doc, path){
	w=chromeWindow.makeWebBrowserPersist();
	w.saveDocument(doc, path, null, null, 0,0);
}

function savePageWithDefaults(chromeWindow, doc){
	var dir=Chickenfoot.SimpleIO.downloadDir();
	var pageTitle=doc.title;
	//rip out illegal file names!
	pageTitle= pageTitle.replace(':', "");
	var extension = "htm";
	var collisionCount = 0;
	var file=makeFileFromParts(dir, pageTitle, collisionCount, extension);
	//output(file);
	while (file.exists()) {
            collisionCount++;
			file=makeFileFromParts(dir.parent, pageTitle, collisionCount, extension);
    }
	w=chromeWindow.makeWebBrowserPersist();
	w.saveDocument(doc, file, null, null, 0,0);
}

function savePageToDefaultDirectoryWithFilename(chromeWindow, doc, filename){
	filename=filename.replace(':', "");
	var file=Chickenfoot.SimpleIO.toFile(filename);	
	w=chromeWindow.makeWebBrowserPersist();
	w.saveDocument(doc, file, null, null, 0,0);

}









// Packages and java are not defined in the global namespace for XPCOM components,
// so we need to get them from a chrome window.  But getting them from the first
// chrome window (as setupWindow() does with other DOM classes, like Node) is a bad
// idea, because it forces Java to load during FF startup, a significant cost.
// So we fetch the Packages reference lazily.
this.Packages getter = function() {
  var chromeWindow = getAnyChromeWindow();
  if (!chromeWindow) throw new Error("can't find a Firefox window to get Packages from");

  var Packages = chromeWindow.Packages;
  
  // replace lazy getters with direct references
  delete this.Packages;
  delete this.java;
  this.Packages = Packages;
  this.java = Packages.java;
  
  // return the Packages reference
  return Packages;
}

this.java getter = function() {
  return this.Packages.java;
}


/** @return true if Firefox has Java 1.5 or later installed (has the side effect of loading Java if Java is installed) */
function hasJava() {
  try {
    // first we try calling a benign java function,
    // which should throw an exception if Java is disabled or not installed
    var a = Packages.java.lang.String.valueOf(5)
    
    // now that we're sure Java is available,
    // we want to make sure it's the correct version
    var version = Packages.java.lang.System.getProperty('java.vm.version').match(/^(\d+)\.(\d+)/);
    var max = parseInt(version[1], 10);
    var min = parseInt(version[2], 10);
    return (max > 1 || (max === 1 && min >= 5));
  } catch (e) {
    return false;
  }
}


/**
 * JavaClassLoader represents a set of JAR files containing Java code.
 * Each JAR file is named by a URL, which can be a file: or http: URL (but not chrome:, because 
 * Java knows nothing about that protocol).
 *
 */
function JavaClassLoader(/*string[]*/ jarPaths) {
  var policy = JavaClassLoader.getJavaPolicy();
  var urls = [];
  for each (var jp in jarPaths) {
    var url = new Packages.java.net.URL(jp);
    policy.addURL(url);
    urls.push(url);
  }
  
  this._classLoader = Packages.java.net.URLClassLoader.newInstance(urls);

}

/*
 * Return a Java security policy that gives all permissions to a set of permitted URLs.
 * If the policy doesn't already exist, create it and install it into the Java runtime system.
 */
JavaClassLoader.getJavaPolicy = function() {
  if (JavaClassLoader._policy) return JavaClassLoader._policy;
  
  var jarPath = getExtensionFileUrl("{896b34a4-c83f-4ea7-8ef0-51ed7220ac94}") + "java/chickenfoot-java.jar";
  var policyClassLoader = new Packages.java.net.URLClassLoader([ new Packages.java.net.URL(jarPath) ]);
  var policyClass = Packages.java.lang.Class.forName(
       "edu.mit.csail.simile.firefoxClassLoader.URLSetPolicy",
       true,
       policyClassLoader);
    
  var policy = policyClass.newInstance();
  policy.setOuterPolicy(Packages.java.security.Policy.getPolicy());
  Packages.java.security.Policy.setPolicy(policy);
  policy.addPermission(new Packages.java.security.AllPermission());
  JavaClassLoader._policy = policy;
  return policy;
}

/**
 * Return the Java Class object for a fully-qualified class name found in one of this
 * Java object's JAR files.
 */
JavaClassLoader.prototype.getClass = function getClass(/*string*/ className) {
  return Packages.java.lang.Class.forName(className, true, this._classLoader);
}


/**
 * Returns the directory where an extension is installed expressed as a file:
 * URL terminated by a slash.  The extension must be named by its GUID.
 */
function getExtensionFileUrl(guid) {
  var mgr = Components
       .classes["@mozilla.org/extensions/manager;1"]
       .getService(Components
       .interfaces.nsIExtensionManager);
  var loc = mgr.getInstallLocation(guid);
  var file = loc.getItemLocation(guid);
  var uri = Components.classes["@mozilla.org/network/protocol;1?name=file"]
                       .getService(Components.interfaces.nsIFileProtocolHandler)
                       .newFileURI(file)
  return uri.spec;
}

var ChickenfootJars = null;
function getChickenfootJars() {
  if (ChickenfootJars) return ChickenfootJars;
    
  var jars = [ getExtensionFileUrl("{896b34a4-c83f-4ea7-8ef0-51ed7220ac94}") + "java/chickenfoot-java.jar" ];
  ChickenfootJars = new JavaClassLoader(jars);
  return ChickenfootJars;
}

/**
 * Get one of Chickenfoot's built-in classes.
 */
function getJavaClass(className) {
  return getChickenfootJars().getClass(className);
}

function showNeedsJavaDialog(/*Window*/ window) {
  window.openDialog("chrome://chickenfoot/content/needsJavaDialog.xul",
    "showmore",
    "chrome,modal,centerscreen,dialog,resizable",
    {})
}


/**
 * Creates a new, random GUID
 *
 */

function generateRandomGuid() {
  var uuidGenerator = Components.classes["@mozilla.org/uuid-generator;1"]
        .getService(Components.interfaces.nsIUUIDGenerator);
  var guid = "" + uuidGenerator.generateUUID();
  return guid.substring(1, 37);
}
/**
 * This method assembles all of the required files to write the xpi file into a temporary directory,
 * then writes the contents of this temporary directory to an xpi file. The temporary directory is
 * a folder with a unique, auto-generated name in the same directory that the xpi file will be written to.
 * This temporary directory is deleted upon completion of the packaging. The xpi file and the
 * chickenfoot-xpi-tie.jar inside of it are then zipped using the nsIZipWriter XPCOM component.
 *
 * @param outputPath : String //full absolute path of where the xpi file will be written to
 * @param templateTags : Object //map of strings that be used to fill in template files
 * @param triggers : Array<Trigger> //array of the Trigger objects to be included in the xpi file
 * @param userFiles : Array<String> //array of other filepaths (not triggers) to be included in the xpi file
 * @param iconPath : String //full absolute path of the icon for the extension, or null to use the default icon
 * @param chromeWindow : ChromeWindow //reference to chromeWindow of browser
 * @return nsIFile object of generated xpi file
 */
function xpiTie(/*String*/outputPath, /*Object*/templateTags, /*Array*/triggers, /*Array*/userFiles, /*String*/iconPath, /*ChromeWindow*/chromeWindow) {
  //convenient reference to Chickenfoot.SimpleIO
  var io = SimpleIO;

  //get reference to nsILocalFile object for xpi file
  var xpiFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
  xpiFile.initWithPath(outputPath);
  
  //create a temporary directory inside the system's designated temporary directory for building the jar and xpi files
  var tempDir = Components.classes["@mozilla.org/file/directory_service;1"]
                       .getService(Components.interfaces.nsIProperties)
                       .get("TmpD", Components.interfaces.nsIFile);
  tempDir.append("cftExtPkgr_TEMP_DIR");
  tempDir.createUnique(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0666); 
  var tempDirPath = tempDir.path;
  //debug("tempDirPath = " + tempDirPath);

  //get extension path
  var mgr = Components.classes["@mozilla.org/extensions/manager;1"].getService(Components.interfaces.nsIExtensionManager);
  var loc = mgr.getInstallLocation("{896b34a4-c83f-4ea7-8ef0-51ed7220ac94}");
  var extFile = loc.getItemLocation("{896b34a4-c83f-4ea7-8ef0-51ed7220ac94}");
  var extensionPath = extFile.path;
  
  //assemble contents for and zip chickenfoot-xpi-tie.jar
  writeXpiTieJar();
  
  //assemble contents for and zip xpi file
  writeXpiFile(tempDir);

  return xpiFile;
  
  
  /**
   * This inner function first assembles all the needed files for the chickenfoot-xpi-tie.jar file into a 'content' directory inside
   * the temporary directory. Then it writes the chickenfoot-xpi-tie jar to a 'chrome' directory inside the temporary directory.
   **/
  function writeXpiTieJar() {
    //create chickenfoot-xpi-tie.jar
    var contentDir = tempDir.clone();
    contentDir.append("chickenfoot-xpi-tie_TEMP_DIR"); contentDir.append("content");
    var contentDirPath = contentDir.path;

    //add files to content directory ------
    var contentFiles = ["chickenscratch.xul", "chickenscratch.js", "overlay.xul"];
    for(var i=0; i<contentFiles.length; i++) {
      //get template file to read
      var contentReadFile = extFile.clone();
      contentReadFile.append("export"); 
      contentReadFile.append(contentFiles[i]);
      var templateTxt = io.read(contentReadFile);
      
      //write the templated text into the temp dir
      var contentWriteFile = contentDir.clone();
      contentWriteFile.append(contentFiles[i]);
      io.write(contentWriteFile, fillTemplate(templateTxt, templateTags));
    }

    //add icon.png to content directory ------
    if((iconPath != null) && (iconPath != "") && io.exists(io.toFile(iconPath))) { //get user's image if supplied 
      var imgFile = io.toFile(iconPath);
      imgFile.copyTo(contentDir, "icon.png");
    }
    else { //otherwise get the chickenfoot image from chickenfoot.jar
      var zipReader = Components.classes["@mozilla.org/libjar/zip-reader;1"].createInstance(Components.interfaces.nsIZipReader);
      
      //create a blank image file in the content dir to overwrite with
      var iconFile = contentDir.clone();
      iconFile.append("icon.png");
      io.writeBytes(iconFile, "", false);

      //get a reference to the chickenfoot.jar file inside the chickenfoot extension
      var jarFile = extFile.clone();
      jarFile.append("chrome"); 
      jarFile.append("chickenfoot.jar");

      //this init call is needed in Firefox 2 and lower, but throws an exception in Firefox 3, so just catch it and continue
      try { zipReader.init(jarFile); } catch(e) { }
      zipReader.open(jarFile);
      zipReader.extract("skin/classic/beak-32.png", iconFile);
      zipReader.close();
    }

    //add libraries to content directory ------
    var librariesFile = extFile.clone();
    librariesFile.append("libraries");
    librariesFile.copyTo(contentDir, "libraries");

    //zip content directory to chrome\\chickenfoot-xpi-tie.jar ------
    var xpiChromeDir = tempDir.clone();
    xpiChromeDir.append("chrome");
    xpiChromeDir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0666);
    
    var xpiTempDir = tempDir.clone();
    xpiTempDir.append("chickenfoot-xpi-tie_TEMP_DIR");
    
    var xpiTieFile = tempDir.clone();
    xpiTieFile.append("chrome"); 
    xpiTieFile.append("chickenfoot-xpi-tie.jar");
    
    writeToZip(chromeWindow, xpiTempDir.path, xpiTieFile.path);
    
    //delete content directory from temporary directory ------
    contentDir.parent.remove(true);
  } //end writeXpiTieJar()
  
  
  /**
   * This inner function first assembles all the needed files for the xpi file into the temporary directory. Then it 
   * writes all the files inside the temporary directory to the xpi file, and deletes the temporary directory.
   * Note: each '------' separates the code for assembling the needed files for a different top-level entry in the xpi file
   **/
  function writeXpiFile(/*nsILocalFile*/tempDir) {
    //create components directory ------
    // by copying chickenfoot's components directory EXCEPT FOR ChickenfootCommandLineHandler.js
    var cftComponentsDir = extFile.clone();
    cftComponentsDir.append("components");
    cftComponentsDir.copyTo(tempDir, "components");

    var commandLineHandlerFile = tempDir.clone()
    commandLineHandlerFile.append("components"); 
    commandLineHandlerFile.append("ChickenfootCommandLineHandler.js");
    if(io.exists(commandLineHandlerFile)) { commandLineHandlerFile.remove(false); }
    
    //Chickenfoot.js and Chicken-bypass.js are templates and need to be filled in
    var componentsFiles = ["Chicken-bypass.js", "Chickenfoot.js"];
    for(var i=0; i<componentsFiles.length; i++) {
      //get template file to read
      var componentsReadFile = extFile.clone();
      componentsReadFile.append("export"); 
      componentsReadFile.append(componentsFiles[i]);
      var templateTxt = io.read(componentsReadFile);
      
      //write the templated text into the temp dir
      var componentsWriteFile = tempDir.clone();
      componentsWriteFile.append("components"); 
      componentsWriteFile.append(componentsFiles[i]);
      io.write(componentsWriteFile, fillTemplate(templateTxt, templateTags));
    }

    //create defaults directory ------
    //get template file to read
    var preferencesReadFile = extFile.clone();
    preferencesReadFile.append("export"); 
    preferencesReadFile.append("preferences.js");
    var preferencesTxt = io.read(preferencesReadFile);

    //add preferences.js file to defaults directory
    var preferencesWriteFile = tempDir.clone();
    preferencesWriteFile.append("defaults"); 
    preferencesWriteFile.append("preferences"); 
    preferencesWriteFile.append("preferences.js");
    io.write(preferencesWriteFile, fillTemplate(preferencesTxt, templateTags), false);

    //create java directory -------
    // by copying chickenfoot's java directory
    var cftJavaDir = extFile.clone();
    cftJavaDir.append("java");
    cftJavaDir.copyTo(tempDir, "java");

    //write chrome.manifest file ------
    //get template file to read
    var manifestReadFile = extFile.clone();
    manifestReadFile.append("export"); 
    manifestReadFile.append("chrome.manifest");
    var manifestTemplateTxt = io.read(manifestReadFile);
    var manifestWriteFile = tempDir.clone();
    manifestWriteFile.append("chrome.manifest");
    io.write(manifestWriteFile, fillTemplate(manifestTemplateTxt, templateTags));
    
    //write install.rdf file ------
    //get template file to read
    var installReadFile = extFile.clone();
    installReadFile.append("export"); 
    installReadFile.append("install.template.rdf");
    var installTemplateTxt = io.read(installReadFile);
    
    //write to upper level xpi directory level
    var installWriteFile = tempDir.clone();
    installWriteFile.append("install.rdf");
    io.write(installWriteFile, fillTemplate(installTemplateTxt, templateTags));

    //write triggers.xml file ------
    var triggersXmlTxt = createTriggersXML(triggers);
    var triggersWriteFile = tempDir.clone();
    triggersWriteFile.append("triggers.xml");
    io.write(triggersWriteFile, fillTemplate(triggersXmlTxt, templateTags));

    //write trigger script files ------
    for(var i=0; i<triggers.length; i++) {
      var triggerScriptFile = triggers[i].path;
      triggerScriptFile.copyTo(tempDir, null);
    }
    
    //write user files and folders ------
    for(var i=0; i<userFiles.length; i++) {
      var userFile = io.toFile(userFiles[i].replace(/\\/g, "\\"));
      if(!io.exists(userFile)) { continue; }
      userFile.copyTo(tempDir, null);
    }
    
    //write temporary directory to xpi file, then delete temporary directory ------
    var tempDir = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
    tempDir.initWithPath(tempDirPath);
    writeToZip(chromeWindow, tempDirPath, outputPath);
    tempDir.remove(true);
    
    //write update.rdf file if url supplied ------
    if(templateTags.EXTENSION_URL != "") {
      //get template file to read
      var updateReadFile = extFile.clone();
      updateReadFile.append("export"); 
      updateReadFile.append("update.template.rdf");
      var updateTemplateTxt = io.read(updateReadFile);
      
      //write to same directory as xpi file
      var updateWriteFile = xpiFile.parent.clone();
      updateWriteFile.append("update.rdf");
      io.write(updateWriteFile, fillTemplate(updateTemplateTxt, templateTags));
    }
  } //end writeXpiFile()
} //end xpiTie()



/**
 * This method takes a string and replaces all instances of the keys of the map with the value that they
 * are mapped to. Just a replace-all function on the string for the keys of the map with their values.
 *
 * @param txt : String //this is the string that will be modified
 * @param map : Object //this is the map where the keys and their values come from
 * @return the modified string
 **/
function fillTemplate(/*String*/ txt, /*Object*/ map) {
  for(var property in map) { txt = txt.replace(new RegExp("@" + property + "@", "g"), map[property]); }
  return txt;
}



/**
 * This method writes all the files inside the temporary directory to a new zip file located at the output
 * file path.
 *
 * @param chromeWindow : ChromeWindow //reference to chromeWindow of browser
 * @param tempDirPath : String //full absolute path of the temporary directory
 * @param outputPath : String //full absolute path where the zip file will be written to
 **/
function writeToZip(/*ChromeWindow*/chromeWindow, /*String*/tempDirPath, /*String*/outputPath) {
    //references to tempDir and output zip file
    var tempDir = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
    tempDir.initWithPath(tempDirPath);
    var zipFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
    zipFile.initWithPath(outputPath);
		
    //use the same zip writer for writing all entries
    var ZipWriter = Components.Constructor("@mozilla.org/zipwriter;1","nsIZipWriter");
    var zipWriter = new ZipWriter();
    zipWriter.open(zipFile, /*PR_RDWR*/4 | /*PR_CREATE_FILE*/8 | /*PR_TRUNCATE*/32);
    
    //iterate through all files in tempDir and write them to output file
    var tempDirFiles = tempDir.directoryEntries;
    while(tempDirFiles.hasMoreElements()) { writeFileToZip(tempDirFiles.getNext().QueryInterface(Components.interfaces.nsIFile), zipWriter, null); }
    zipWriter.close();
}



/**
  * This method writes a single file or directory to a zip file using the given zip writer.
  * For directories, this method recursively calls itself on each of the files in the directory.
  * The file or directory is not modified or deleted, only copied. This method never uses a reference
  * to the actual zip file or its path, it only uses the given zip writer.
  * 
  * @param currentFile : nsIFile //nsIFile object to be written to the zip file
  * @param zipWriter : nsIZipWriter //zip writer used to write to the zip file
  * @param dirName : String //optional prefix to attach to the file name in the zip file, ignored if null
  * 
  * @requires currentFile, zipWriter != null
  **/
function writeFileToZip(/*nsIFile*/currentFile, /*nsIZipWriter*/zipWriter, /*String*/dirName) {
  if (currentFile.isFile()) { //currentFile is a file (i.e. not a directory)
    //file name in zip file
    var fileName = currentFile.leafName;
    if(dirName != null) { fileName = dirName + fileName; }

    //read bytes from file into a buffer, then write to the zip file from this buffer
    try {
      zipWriter.addEntryFile(fileName, Components.interfaces.nsIZipWriter.COMPRESSION_DEFAULT, currentFile, false);
    } catch(e) { chromeWindow.alert('caught exception : nsIZipWriter'); }
  }
  else { //currentFile is a directory
    //directory prefix in zip
    var subDirName = currentFile.leafName + "/";
    if(dirName != null) { subDirName = dirName + subDirName; }

    //iterate through the contents of the directory and recursively call this function on each one
    var listFiles = currentFile.directoryEntries;
    while(listFiles.hasMoreElements()) { writeFileToZip(listFiles.getNext().QueryInterface(Components.interfaces.nsIFile), zipWriter, subDirName); }
  }
}



/**
 * This method creates a triggers.xml file (as a string) given a list of triggers.
 * @param triggers : list of Trigger objects //the triggers to add to the triggers.xml file
 * @return the generated xml document as a string
 */
function createTriggersXML(triggers) {
  var domParser = Components.classes["@mozilla.org/xmlextras/domparser;1"].
                  getService(Components.interfaces.nsIDOMParser);
  var domSerializer = Components.classes["@mozilla.org/xmlextras/xmlserializer;1"].
                        getService(Components.interfaces.nsIDOMSerializer);
  
  var xmlString = '<triggers version="0.5"></triggers>';
  var xmlDoc = domParser.parseFromString(xmlString, "text/xml");
  var docElement = xmlDoc.documentElement;
  
  for(var g=0; g<triggers.length; g++) {
    
    // Fixed bug #382: when triggers are packaged as an extension, all triggers should be enabled in the package
    triggers[g].enabled = true;
    
    gTriggerManager._appendTriggerXmlNode(xmlDoc, docElement, triggers[g]);
  }
  var xmlArray = new Array();
  gTriggerManager._prettyPrint(xmlDoc, "", xmlArray);
  xmlString = "";
  for(var i=0; i<xmlArray.length; i++) {
    xmlString += xmlArray[i];
  }
  //Converting javascript String to java String
  return xmlString;
}
goog.require('goog.string');

/**
 * Split a string into an array of tokens for keyword pattern matching.
 * @param pattern   Keyword pattern to split
 * @return String[] with some additional fields and methods:
 *     .pattern   
 *           Original pattern argument, uncanonicalized
 
 *     .canonicalPattern 
 *           Pattern converted to lowercase, with runs of punctuation and whitespace 
 *           replaced by a single space
 *
 *     .match()
 *           Matching method, see below.
 */
function splitIntoKeywords(/*String*/ pattern) {
  if (!pattern) pattern = "";

  // split pattern into canonicalized tokens  
  var keywords = [];
  //var matchedTokens = pattern.match(/\w+|'[^']+'|"[^"]+"/g);
  var matchedTokens = [];
  var quotedTokens = pattern.match(/'[^']+'|"[^"]+"/g);
  if(quotedTokens) {
    matchedTokens = matchedTokens.concat(quotedTokens);
    pattern = pattern.replace(/'[^']+'|"[^"]+"/g, "");
  }
  pattern = pattern.replace(/^\s+/,"").replace(/\s+$/,"");
  if(pattern){
    matchedTokens = matchedTokens.concat(pattern.split(/\s+/));
  }

  if (matchedTokens) {
    for (var i = 0; i < matchedTokens.length; ++i) {
      keywords[i] = canonicalize(matchedTokens[i].toString());
      //debug("keywords[" + i + "]: [" + keywords[i] + "]");
    }
  }
    
  keywords.pattern = pattern;
  keywords.canonicalPattern = canonicalize(pattern);

  /**
   * Test whether a string matches this keyword pattern.
   * @param text   String to test
   * @return 
   *      0 if no keywords can be found in text (or keywords is empty)
   *      1 if all keywords are found in text
   *      2 if canonical pattern is an exact match for canonical text
   *      a fraction in [0,1] indicating the fraction of keywords 
   *          that were found in text.
   *
   * This function is useful because
   * oftentimes the user's input string will
   * not match the HTML exactly.
   */
  keywords.match = function(/*String*/ text) {
    text = canonicalize(text);
    if (text == this.canonicalPattern) return 2;
    
    if (!this.length) return 0;
    
    if (!this._regex) {
       // create regexes for each token
       this._regex = [];
       for (var i = 0; i < this.length; ++i) {
          if( this[i].match(/^\w+$/) ) // all are English chars
             this._regex[i] = new RegExp("\\b" + this[i] + "\\b");
          else // don't use \b as word boundaries for non-english tokens
             this._regex[i] = new RegExp(this[i]);
       }
    }
       
    var m = 0;
    for (var i = 0; i < this._regex.length; ++i) {
      if (text.match(this._regex[i])) ++m;
    }
    return m / this.length;
  }
  
  /**
   * Generate another keywords object, derived from the same original
   * pattern, but with a new list of tokens.
   */
  keywords.derive = function(/*String[]*/ tokens) {
    tokens.pattern = this.pattern;
    tokens.canonicalPattern = this.canonicalPattern;
    tokens.match = this.match;
    tokens.derive = this.derive;
    return tokens;    
  }

  return keywords;
}

function canonicalize(/*String*/ s) {
  return goog.string.trim(s.replace(/[\s'"~`!@#$%^&*()-+=|\\}\]\[{:;?\/>\.,<]+/g, " ")).toLowerCase();
}

/*
function editDistance(s1, s2) {
  if (!javaEditDistance) {
    javaEditDistance = 
      getJavaClass("chickenfoot.experimental.StringMetrics")
        .getMethod("editDistance",
                   [Packages.java.lang.String, Packages.java.lang.String]);
  }
  return javaEditDistance.invoke(null, [s1, s2]);
}
*/

/**
 * Match is an iterator that returns the matches to a pattern,
 * with accessors for obtaining the matches in various forms
 * (as plain text, as HTML, as Node, as Range).
 */
function Match(/*string*/ html,
               /*Match*/ next,
               /*Element*/ element,
               /*Range*/ range,
               /*Document*/ document,
               /*int*/ index,
               /*boolean*/ hasMatch
               ) {
  this._html = html;
  this._count = (next) ? next.count + 1 : 0;
  this._next = next;
  this._element = element;
  this._range = range;
  if (!element && range) this._element = rangeToElement(range);
  if (!range && element) this._range = nodeToRange(element);
  this._document = document;
  this._index = index;
  this._hasMatch = !!hasMatch;
  
  if (!this._hasMatch) {this._text =  "no matches";}
  else if (this._range) {this._text = this._range.toString();}
  else {this._text = "";}
}

function winToMatch(/*win*/win) {
  var html = "chromeWindow"
  var range = null
  var doc = win.document
  return new Match(html, EMPTY_MATCH, win, range, doc, 0, true);
}

function nodeToMatch(/*Node*/ node) {
  return new Match((flattenDom(node))[0],
                              EMPTY_MATCH,
                              nodeToElement(node),
                              nodeToRange(node),
                              node.ownerDocument,
                              0,  
                              true);
}

function nodeToElement(/*Node*/ node) {
  return (node.nodeType == Node.ELEMENT_NODE) ? node : nodeToElement(node.parentNode);
}

function nodesToMatches(/*Node[]*/ nodes) {
  var lastMatch = EMPTY_MATCH;
  for (var i = nodes.length - 1; i >= 0; --i) {
    var match = nodeToMatch(nodes[i]);
    match._next = lastMatch;
    match._count = lastMatch.count + 1;
    match._index = i;
    lastMatch = match;
  }
  return lastMatch;
}

// Make a single-element Match iteration that consists of just the
// current Match element m, or EMPTY_MATCH if m is EMPTY_MATCH.
function oneMatch(/*Match*/ m) {
  if (!m.hasMatch) return EMPTY_MATCH;
  else return new Match(m.html,
                       EMPTY_MATCH,
                       m.element,
                       m.range,
                       m.document,
                       0,
                       true);
}

// Augment an Error thrown by a pattern-matching function (such as click())
// with the Match that caused the error, which also adds the ability 
// to highlight the Match in the web page for easier debugging.
function addMatchToError(/*Error*/error, /*Match*/ match) {
  error.match = match;
  error.toChickenfootDebugOutput = function(/*Node*/ debugEntry) {
    if (match.hasMatch) selectAll(match.document.defaultView, match);
    return this;
  }
  return error;
}

Match.prototype.find = function(pattern) {
  return Pattern.find(this._document, pattern, [], this.range);
}
Match.prototype.click = function(pattern) { 
  clickImpl(this._document, pattern, this.range); 
};
Match.prototype.enter = function(pattern, value) { 
  enterImpl(this._document, pattern, value, this.range); 
};
Match.prototype.reset = function(pattern) { 
  resetImpl(this._document, pattern, this.range); 
};
Match.prototype.pick = function(listPattern, choicePattern, checked) { 
  pickImpl(this._document, arguments, this.range); 
};
Match.prototype.keypress = function(keySequence, destination) { 
  keypressImpl(this._document, keySequence, destination); 
  };
Match.prototype.unpick = function(listPattern, choicePattern, checked) { 
  unpickImpl(this._document, arguments, this.range); 
};
Match.prototype.check = function(pattern,checked) { 
  checkImpl(this._document, pattern, this.range); 
};
Match.prototype.uncheck = function(pattern) { 
  uncheckImpl(this._document, pattern, this.range); 
};

Match.prototype.select = function(pattern) {
  selectImpl(this._document, pattern, this.range);
}

try {
  // Iterators are only available in Firefox 2.0+.
  // If we're running in an older version of Firefox,
  // then this eval() will simply fail and we won't 
  // have an __iterator__ property on Match.
  Match.prototype.__iterator__ = 
    eval("function() { for (var m = this; m.hasMatch; m = m.next) yield m; }");
} catch (err) {
  // yield must have been a syntax error, so just don't support iterators
}

Match.prototype.__defineGetter__("hasMatch",
  function() { return this._hasMatch; });

Match.prototype.__defineGetter__("count",
  function() { return this._count; });
  
Match.prototype.__defineGetter__("next",
  function() { return this._next; });

Match.prototype.__defineGetter__("range",
  function() { return this._range; });

Match.prototype.__defineGetter__("content",
  function() {
    if (this._content) return this._content;
    else if (this._range) return this._content = this._range.cloneContents();
    // TODO set content sensibly when Range is null
    else return null;
  });

Match.prototype.__defineGetter__("element",
  function() { return this._element; });

Match.prototype.__defineGetter__("document",
  function() { return this._document; });

Match.prototype.__defineGetter__("text",
  function() { return this._text; });

Match.prototype.__defineGetter__("html",
  function() { return this._html; });

Match.prototype.__defineGetter__("index",
  function() { return this._index; });

Match.prototype.toString = function() {
  if (!this._hasMatch) {return "no matches";} 
  else {return "[object Match]";}
}


Match.prototype.isDomRange = function() {
  return (this.range != null);
}

// add every method of String as a method of Match that forwards to toString() 
Match.prototype.__defineGetter__("length",
  function() { return this.toString().length; });
// automatically generated forwarding methods
Match.prototype.anchor = function() { var str = this.toString(); return str.anchor.apply(str, arguments); } 
Match.prototype.big = function() { var str = this.toString(); return str.big.apply(str, arguments); } 
Match.prototype.blink = function() { var str = this.toString(); return str.blink.apply(str, arguments); } 
Match.prototype.bold = function() { var str = this.toString(); return str.bold.apply(str, arguments); } 
Match.prototype.charAt = function() { var str = this.toString(); return str.charAt.apply(str, arguments); } 
Match.prototype.charCodeAt = function() { var str = this.toString(); return str.charCodeAt.apply(str, arguments); } 
Match.prototype.concat = function() { var str = this.toString(); return str.concat.apply(str, arguments); } 
Match.prototype.fixed = function() { var str = this.toString(); return str.fixed.apply(str, arguments); } 
Match.prototype.fontcolor = function() { var str = this.toString(); return str.fontcolor.apply(str, arguments); } 
Match.prototype.fontsize = function() { var str = this.toString(); return str.fontsize.apply(str, arguments); } 
Match.prototype.indexOf = function() { var str = this.toString(); return str.indexOf.apply(str, arguments); } 
Match.prototype.italics = function() { var str = this.toString(); return str.italics.apply(str, arguments); } 
Match.prototype.lastIndexOf = function() { var str = this.toString(); return str.lastIndexOf.apply(str, arguments); } 
Match.prototype.link = function() { var str = this.toString(); return str.link.apply(str, arguments); } 
Match.prototype.localeCompare = function() { var str = this.toString(); return str.localeCompare.apply(str, arguments); } 
Match.prototype.match = function() { var str = this.toString(); return str.match.apply(str, arguments); } 
Match.prototype.replace = function() { var str = this.toString(); return str.replace.apply(str, arguments); } 
Match.prototype.search = function() { var str = this.toString(); return str.search.apply(str, arguments); } 
Match.prototype.slice = function() { var str = this.toString(); return str.slice.apply(str, arguments); } 
Match.prototype.small = function() { var str = this.toString(); return str.small.apply(str, arguments); } 
Match.prototype.split = function() { var str = this.toString(); return str.split.apply(str, arguments); } 
Match.prototype.strike = function() { var str = this.toString(); return str.strike.apply(str, arguments); } 
Match.prototype.sub = function() { var str = this.toString(); return str.sub.apply(str, arguments); } 
Match.prototype.substr = function() { var str = this.toString(); return str.substr.apply(str, arguments); } 
Match.prototype.substring = function() { var str = this.toString(); return str.substring.apply(str, arguments); } 
Match.prototype.sup = function() { var str = this.toString(); return str.sup.apply(str, arguments); } 
Match.prototype.toLocaleLowerCase = function() { var str = this.toString(); return str.toLocaleLowerCase.apply(str, arguments); } 
Match.prototype.toLocaleUpperCase = function() { var str = this.toString(); return str.toLocaleUpperCase.apply(str, arguments); } 
Match.prototype.toLowerCase = function() { var str = this.toString(); return str.toLowerCase.apply(str, arguments); } 
Match.prototype.toSource = function() { var str = this.toString(); return str.toSource.apply(str, arguments); } 
//Match.prototype.toString = function() { var str = this.toString(); return str.toString.apply(str, arguments); } 
Match.prototype.toUpperCase = function() { var str = this.toString(); return str.toUpperCase.apply(str, arguments); } 
Match.prototype.valueOf = function() { var str = this.toString(); return str.valueOf.apply(str, arguments); } 

// Does not seem to work correctly when listed before complete prototype
EMPTY_MATCH = new Match();
goog.require('goog.dom');
goog.require('goog.string');

function Pattern() {

  /**
   * Minimum Keywords.match() return value to be a candidate for a keyword pattern match
   */
  const STRENGTH_THRESHOLD = 0.1;
  
  
  // Strength factors
  
  /* Weights for judging a captioned node match
   * These must sum to 1.
   */
  const KEYWORD_FACTOR = 0.7;
  const POSITION_FACTOR = 0.1;
  const DISTANCE_FACTOR = 0.1;
  const OVERLAP_FACTOR = 0.05;
  
  /**
   * Because textual matches to the right are less likely
   * than textual matches to the left for a textbox,
   * the strength of a "right" match is reduced by a
   * constant factor
   */
  const TEXTBOX_FACTORS = {above:1, left:1, right:0.8, below:0.8};

  /**
   * Top and left matches are less likely for checkboxes and radio buttons.
   */    
  const CHECKBOX_FACTORS = {above:0.1, left:0.5, right:1, below:0.01};
  
  /**
   * Treat listboxes like textboxes.
   */    
  const LISTBOX_FACTORS = {above:1, left:1, right:0.5, below:0.5};
  
  /**
   * Allow all matches for images.
   */    
  const IMAGE_FACTORS = {above:1, left:1, right:1, below:1};
  
  /**
   * Explicit <LABEL> elements get extra points.
   */
  const LABEL_FACTOR = 2.0;
  
  /**
   * Nested elements (e.g. text inside a SELECT) get extra points.
   */
  const NESTED_FACTOR = 2.0;
  
  
  /* Exported methods */
  Pattern.find = find;
  Pattern.getFindRoot = getFindRoot;

  // enable this to get debugging output
  Pattern.debugPatternMatching = false;

  
  /* Component types */
  Pattern.LINK = "link";
  Pattern.BUTTON = "button";
  Pattern.TEXTBOX = "textbox";
  Pattern.CHECKBOX = "checkbox";
  Pattern.RADIOBUTTON = "radiobutton";
  Pattern.LISTBOX = "listbox";
  Pattern.LISTITEM = "listitem";
  Pattern.FORM = "form";
  Pattern.COLUMN = "column";
  Pattern.ROW = "row";
  Pattern.CELL = "cell";
  Pattern.TABLE = "table";
  //TODO add box
  Pattern.IMAGE = "image";
  Pattern.TEXT = "text";
  Pattern.ID = "id";
  Pattern.MENU = "menu";
  Pattern.MENUITEM = "menuitem";
  Pattern.TAB = "tab";
  Pattern.WINDOW = "window";
  
  // findMethods maps each component type name to the method that searches for
  // components of that type.
  // !!! every key in findMethods should be all lowercase
  var findMethods = {
    link: findLinkMatches,
    button: findButtonMatches,
    textbox: findTextboxMatches,  
    checkbox: findCheckboxMatches,
    radiobutton: findRadioButtonMatches,
    listbox: findListboxMatches,
    listitem: findOptionMatches,
    form: findForms,
    column : findColumns,
    row : findRows,
    table : findTables,
    cell : findCells,
    image: findImages,
    //TODO add box
    text : findTextMatches,
    id : findIdMatches,
    menu: findMenuMatches,
    menuitem: findMenuItemMatches,
    tab: findTabMatches,
    window: findWindowMatches
  };
  
  // construct a regexp that tests whether a pattern ends with one of the 
  // component type names
  var typeNames = [];
  for (typeName in findMethods) {
    typeNames.push(typeName);
  }
  var typeSuffixRegexp = new RegExp('\\b(' + typeNames.join('|') + ')\\s*$', 'i');
  
  Pattern.typeNames = typeNames;
 
  /*
   * Find a pattern.
   *
   *  doc: document to search.  (If context argument is provided, then this argument
   *        is ignored and context.document is used instead.)
   *
   *  pattern: pattern to search for, which may be:
   *
   *            a keyword pattern, represented as a string
   *            a regular expression, represented by a regex object
   *            an XPath pattern, represented as a Javascript object of type XPath
   *
   *          If pattern is a keyword pattern and ends with a type name (e.g. "textbox"), 
   *          then strip that type name from the keyword pattern and use it instead of
   *          the types argument.
   *
   *          Pattern may be null, which indicates that the caller just wants the nodes of 
   *          the given types.  (Used, for example, by enter() with only one argument.)
   *
   *  types: types of nodes to search.  
   *         Array may contain one or more of Pattern.LINK, Pattern.BUTTON, etc.
   *         May be null, which indicates that the caller doesn't care.
   *
   *  context: optional range in which matches must appear 
   *
   *  requires: (1) either types or pattern is non-null;
   *            (2) if pattern is a keyword pattern,
   *                  then either types is non-null or pattern ends with a type name
   *
   *  returns: Match iteration:
   *           If pattern was a regex pattern, the Match iteration contains 
   *           all the text regions it matches.
   *
   *           If pattern was a keyword pattern, the Match iteration contains the 
   *           highest-strength match (plus any matches that are tied with it in strength)
   */
  function find(/*Document*/ doc, 
                /*Pattern*/ pattern, 
                /*optional String[]*/ types, 
                /*optional Range*/ context) {
    if (context) doc = context.startContainer.ownerDocument;

    // replace null arguments with valid, empty objects
    if (pattern === null) {
      pattern = "";
    }

    if (instanceOf(pattern, Match)) {return oneMatch(pattern);}

    if (instanceOf(pattern, Node)) {
      return nodeToMatch(pattern);
    }
    
    if (instanceOf(pattern, Range)) {
      throw new Error("not implemented yet");
    }

    if (instanceOf(pattern, XPath)) {
        var docs = getAllVisibleFrameDocuments(doc);
        
        var nodes = [];
        for (var i = 0; i < docs.length; ++i) {
            var frameDoc = docs[i];
            var contextNode = context ? rangeToContainer(context) : frameDoc.documentElement;
            var result = frameDoc.evaluate(pattern.xpathExpression,
                            contextNode,
                            pattern.namespaceResolver,
                            pattern.resultType,
                            null); // create new result
            // The result cannot be XPathResult.ANY_TYPE even though that
            // may have been passed to evaluate() -- it should be converted
            // to whichever type the result actually is.
            switch (result.resultType) {
                case XPathResult.BOOLEAN_TYPE:
                case XPathResult.STRING_TYPE:
                case XPathResult.NUMBER_TYPE:
	                throw new Error("The pattern \"" + pattern.xpathExpression + "\" did not match part of the web page.");
	                break;
    
                // single node
                case XPathResult.ANY_UNORDERED_NODE_TYPE:
                case XPathResult.FIRST_ORDERED_NODE_TYPE:
                            debug("single node");
	                var node = result.singleNodeValue;
	                nodes.push(nodeToMatch(node));
	                break;
	              
                // iterator        
                case XPathResult.UNORDERED_NODE_ITERATOR_TYPE:
                case XPathResult.ORDERED_NODE_ITERATOR_TYPE:                                
	                var node;
	                while (node = result.iterateNext()) { nodes.push(node); }
	                break;
            
                // snapshot
                case XPathResult.ORDERED_NODE_SNAPSHOT_TYPE:
                case XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE:
	                for (var i = 0; i < result.snapshotLength; ++i) { nodes.push(result.snapshotItem(i)); }
	                break;
            
                default:
	                Test.fail("Unrecognized XPathResult type: " + pattern.resultType);
            }
        }
        return nodesToMatches(nodes);
    }

    // TODO: handle XUL?
    if (instanceOf(pattern, RegExp)) {
      return findRegexp(doc, pattern, context);
    }
    
    // otherwise it's a keyword pattern
    if (typeof pattern == "string" || instanceOf(pattern, String)) {
      var explicitType = pattern.match(typeSuffixRegexp);
      if (explicitType) {
        types = [explicitType[1].toLowerCase()];
        pattern = goog.string.trim(pattern.substring(0, explicitType.index));
      }
      if (!types) types = ['text'];

      var keywords = splitIntoKeywords(pattern);

      return findKeywords(doc, types, keywords, context);
    }
    
    throw new Error("unknown pattern: " + pattern);
  }

  function findKeywordsInAllFrames(/*Document*/ doc, /*String[]*/ types, /*Keywords*/ keywords, /*optional Range*/ context) {
    var docs = getAllVisibleFrameDocuments(doc);

    var matches = [];

    for (var j = 0; j < docs.length; ++j) {
      var frameDoc = docs[j];

      for (var i = 0; i < types.length; ++i) {
        var type = types[i].toLowerCase();
        var f = findMethods[type];
        if (!f) {
          throw new Error("Unknown keyword pattern type: " + type);
        }
        f(matches, frameDoc, keywords, context);
      }
    }
    
    if (matches.length == 0) {
      for (var j = 0; j < docs.length; ++j) {
        var frameDoc = docs[j];
        matches = findFieldsByInternalName(frameDoc, types, keywords, context);
        //debug("name matches " + matches.length);
      }
    }
    
    return matches;
  }
  
  /**
   * Find all fields of the given types whose name attribute matches the pattern exactly.
   * Return InternalMatches[] array.
   */
  function findFieldsByInternalName(/*Document*/ doc, /*String[]*/ types, /*Keywords*/ keywords, /*optional Range*/ context) {
    var matches = [];
    for (var i = 0; i < types.length; i++) {
      var type = types[i].toLowerCase();
      var inputs = null;

      var PREDICATES = {
         button: isClickable,
         radiobutton: isRadioButton,
         textbox: isTextbox,
         checkbox: isCheckbox,
         listbox: isListbox,
         menu: isMenu,
         menuItem: isMenuItem,
         tab: isTab
      };
      if (type in PREDICATES) {
        var root = getFindRoot(doc, context);
        var iterator = findElements(root, PREDICATES[type]);
        while (iterator.nextNode()) {
          var field = iterator.currentNode;
          if (field.name == keywords.pattern && isVisible(field)) {
            matches.push(new InternalMatch(field, 1.0));
          }
        }
      }
    }
    
    return matches;
  }
  
  /*
   * Find a keyword pattern.
   * Returns a Match iteration.
   */
  function findKeywords(/*Document*/ doc, /*String[]*/ types, /*Keywords*/ keywords, 
                        /*optional Range*/ context) {
    if (types == 'window') {
      var matches = findWindowMatches([], keywords); 
      }
      
    else {var matches = findKeywordsInAllFrames(doc, types, keywords, context);}
    // if no matches to pattern, then maybe it contains an ordinal, e.g., "second textbox"
      var ordinalInfo;
      if (matches.length != 1) {
        ordinalInfo = extractOrdinalInfo(keywords);      
        if (ordinalInfo) {
          if (types == 'window') {matches = findWindowMatches([], ordinalInfo.keywords);}
          else {matches = findKeywordsInAllFrames(doc, types, ordinalInfo.keywords, context);}
        } else if (matches.length == 0) {
        return EMPTY_MATCH;
          } 
        }

    // select the highest-strength matches
    var bestMatches = [];
    var highestStrength = 0;
    for (var i = 0; i < matches.length; ++i) {
      var m = matches[i];
      if (m.strength > highestStrength) {
        bestMatches = [m];
        highestStrength = m.strength;
      } else if (m.strength == highestStrength) {
        bestMatches.push(m);
      }
    }

    // apply ordinalInfo, if it exists
    if (ordinalInfo) {
      if (ordinalInfo.ordinal > bestMatches.length) {
        // can't select the 5th textbox if there are only 4 textbox matches
        return EMPTY_MATCH;
      } else {
        // bestMatches is now an array of only one element
        bestMatches = [ bestMatches[ordinalInfo.ordinal - 1] ];
      }
    }

    
    // convert bestMatches into a Match iteration.
    // Since bestMatches may contain the same node several
    // times, filter it to use each node at most once.
    var lastMatch = EMPTY_MATCH;
    var marker = '_ChickenfootFound' + (NEXT_MARKER++);
     
    for (var i = bestMatches.length - 1; i >= 0; --i) {
      var m = bestMatches[i];
      var node = m.node; //will be a window object for findWindowMatches
      //debug(node.document.title);
      //debug(node.wrappedJSObject);  
      if (node[marker]) continue;
      node[marker] = true;
      if (node.window && node.window == node) {var match = winToMatch(node);}
      else {var match = nodeToMatch(node);}
      match._next = lastMatch;
      match._count = lastMatch.count + 1;
      match._index = i;
      lastMatch = match;
    }

    // clear all the flags we set above
    // doesn't work on FF 2.0, so we comment it out
    /*
    for (var i = bestMatches.length - 1; i >= 0; --i) {
      delete bestMatches[i].node.wrappedJSObject[marker];
    }
    */
    
    return lastMatch;
    }


  var NEXT_MARKER = 0;

  /**
   * These are the ordinals that should be recognized in additon to "Nth"
   */
  var recognizedOrdinals = {
    // TODO(mbolin): should "last" be recognized as well? how would it work?
    'first' : 1,
    'second' : 2,
    'third' : 3,
    'fourth' : 4,
    'fifth' : 5,
    'sixth' : 6,
    'seventh' : 7,
    'eighth' : 8,
    'ninth' : 9,
    'tenth' : 10,
    '1st' : 1,
    '2nd' : 2,
    '3rd' : 3
  };
  
  // build a regex that matches ordinals at the beginning of keyword patterns
  var ordinalStr = [];
  for (var ordinal in recognizedOrdinals) {
    ordinalStr.push(ordinal);
  }
  // regexp matches a string that starts with an ordinal such that the ordinal is terminated
  // by either a space or a word boundary, so it will match "second place" but not "secondhand store"
  var ordinalRe = new RegExp("^((\\d+)th|" + ordinalStr.join("|") + ")$", "i");

  /**
   * Given a keyword pattern, such as "1st button" or "third textbox",
   * find the value of the ordinal if one is found at the beginning of the pattern.
   * Ordinal values are 1-based, so for example, extractOrdinalInfo("third textbox")
   * would return 3 as the ordinal.
   *
   * If an ordinal is found, then an object is returned with two properties defined:
   * ordinal: the ordinal value as a positive integer 
   * keywords: Keywords object without the text that the ordinal contributed
   *
   * If no ordinal is detected, then extractOrdinalInfo() returns null.
   *
   * @param keywords Keywords 
   * @return null OR object with int ordinal and remaining keywords
   */  
  function extractOrdinalInfo(/*Keywords*/ keywords) {
    if (!keywords.length) return null;
    
    var m = keywords[0].match(ordinalRe);
    if (!m) return null;
    
    var n;
    if (m[2] && m[2].length) { // matches "Nth"
      n = parseInt(m[2], 10);
    } else if (m[1] in recognizedOrdinals) {
      n = recognizedOrdinals[m[1]];
    } else {
      Test.fail(keywords + " matched ordinalRe but not extractOrdinalInfo()");
    }
    Test.assert(n !== undefined, "n was not defined");    
    Test.assert(n > 0, "ordinal must resolve to a positive number");
    return {
      ordinal : n,
      keywords : keywords.derive(keywords.slice(1))
    };
  }
  
  function findIdMatches(/*InternalMatch[]*/ matches,
                         /*Document*/ doc,
                         /*Keywords*/ keywords, 
                         /*optional Range*/ context) {
    var element = doc.getElementById(keywords);
    // TODO: if (element && context), check if element is in context?
    if (element) matches.push(new InternalMatch(element, 1.0));
  }
  
  function findMenuMatches(/*InternalMatch[]*/ matches,
                           /*Document*/ doc,
                           /*Keywords*/ keywords,
                           /*optional Range*/ context) {
    findSelfLabeledNodes(matches, doc, keywords, isMenu, context);
    }
    
  function findMenuItemMatches(/*InternalMatch[]*/ matches,
                                 /*Document*/ doc,
                                 /*Keywords*/ keywords,
                                 /*optional Range*/ context) {
    findSelfLabeledNodes(matches, doc, keywords, isMenuItem, context);
    }
    
  function findTabMatches(/*InternalMatch[]*/ matches,
                                 /*Document*/ doc,
                                 /*Keywords*/ keywords,
                                 /*optional Range*/ context) {
    findSelfLabeledNodes(matches, doc, keywords, isTab, context);
    }
  /**
   * Finds each clickable-input match to pattern and adds
   * it to the matches array.
   */
  function findButtonMatches(/*InternalMatch[]*/ matches,
                             /*Document*/ doc,
                             /*Keywords*/ keywords, 
                             /*optional Range*/ context) {
    findSelfLabeledNodes(matches, doc, keywords, isClickable, context);
  }


  function findTextMatches(/*InternalMatch[]*/ matches,
                             /*Document*/ doc,
                             /*Keywords*/ keywords,
                             /*optional Range*/ context) {
    // return nothing if no pattern
    if (!keywords || !keywords.length) return;

    // findSelfLabeledNodes() is not appropriate here because it is difficult
    // to define an appropriate nodeFilter. We want to consider all textblobs
    // under the root node, but findSelfLabeledNodes() only matches one textblob
    // per node that matches the filter, whereas there may be multiple literal matches
    // under the root node.
    var root = getFindRoot(doc, context);    

    // TODO: use context, if appropriate
    var blobIterator = new TextBlobIterator(root);
    var blob;
    // TODO: for simple text, may occur more than once in a blob; need to match all instances    
    while (blob = blobIterator.next()) {
      var metric = keywords.match(blob.value);
      if (metric > STRENGTH_THRESHOLD) {
        var node = blob.getContainer();
        if (isVisible(node)) {matches.push(new InternalMatch(node, metric));}
      }
    }
  }
  
  /**
   * Finds each link match to pattern and adds
   * it to the matches array.
   */
  function findLinkMatches(/*InternalMatch[]*/ matches,
                           /*Document*/ doc,
                           /*Keywords*/ keywords,
                           /*optional Range*/ context) {

    findSelfLabeledNodes(matches, doc, keywords, isLink, context);
  }
  
  /**
   * Finds each textbox match to pattern and adds
   * it to the matches array.
   */
  function findTextboxMatches(/*InternalMatch[]*/ matches,
                              /*Document*/ doc,
                              /*Keywords*/ keywords,
                              /*optional Range*/ context) {
    findCaptionedNodes(matches, doc, keywords, isTextbox, TEXTBOX_FACTORS, context);
  }
  
  /**
   * Finds each checkbox match to pattern and adds
   * it to the matches array.
   */
  function findCheckboxMatches(/*InternalMatch[]*/ matches,
                               /*Document*/ doc,
                               /*Keywords*/ keywords,
                               /*optional Range*/ context) {
    if (instanceOf(doc, XULDocument)) { findSelfLabeledNodes(matches, doc, keywords, isCheckbox, context); }
    else { findCaptionedNodes(matches, doc, keywords, isCheckbox, CHECKBOX_FACTORS, context); }
  }
  
  /**
   * Finds each radiobutton match to pattern and adds
   * it to the matches array.
   */
  function findRadioButtonMatches(/*InternalMatch[]*/ matches,
                                  /*Document*/ doc,
                                  /*Keywords*/ keywords,
                                  /*optional Range*/ context) {
    if (instanceOf(doc, XULDocument)) { findSelfLabeledNodes(matches, doc, keywords, isRadioButton, context); }
    else { findCaptionedNodes(matches, doc, keywords, isRadioButton, CHECKBOX_FACTORS, context); }
  }
  
                                  

  /**
   * Finds each listbox match to pattern and adds
   * it to the matches array.
   */
  function findListboxMatches(/*InternalMatch[]*/ matches,
                              /*Document*/ doc,
                              /*Keywords*/ keywords,
                              /*optional Range*/ context) {
    if (instanceOf(doc, XULDocument)) {
      selfLabeled = findSelfLabeledNodes(matches, doc, keywords, isListbox, context);
        if (selfLabeled == null) {
          return findCaptionedNodes(matches, doc, keywords, isListbox, LISTBOX_FACTORS, context);}
        else {return selfLabeled} }
    else { return findCaptionedNodes(matches, doc, keywords, isListbox, LISTBOX_FACTORS, context); }
  }
  
  /**
   * Finds each listitem match to pattern and adds
   * it to the matches array.
   */
  function findOptionMatches(/*InternalMatch[]*/ matches,
                             /*Document*/ doc,
                             /*Keywords*/ keywords,
                             /*optional Range*/ context) {
    return findSelfLabeledNodes(matches, doc, keywords, isListitem, context)
  }

  /**
   * Find elements that are self-labeling (such as buttons or links or menus).
   * 
   */
  function findSelfLabeledNodes(/*InternalMatch[]*/ matches,
                                /*Document*/ doc,
                                /*Keywords*/ keywords, 
                                /*function(node)->boolean*/ nodeTypeFilter,
                                /*optional Range*/ context) {
    var root = getFindRoot(doc, context); 
    var filter = makeFilter(nodeTypeFilter, context);
    var nodeIterator = findElements(root, filter);
    // if no pattern specified, return all nodes of the specified type
    if (!keywords || !keywords.length) {
      if (Pattern.debugPatternMatching) debug("returning all nodes of specified type");
      var node = nodeIterator.nextNode();
      while (node) {
        matches.push(new InternalMatch(node, 0));
        node = nodeIterator.nextNode();
      }
      if (Pattern.debugPatternMatching) debug("found " + matches.length + " such nodes");
    } else {
      var node = nodeIterator.nextNode();
      while (node) {
        var blobIterator = new TextBlobIterator(node);
        var blob = null;
        while (blob = blobIterator.next()) {
          var metric = keywords.match(blob.value);
          //debug(node.tagName + " " + node.label + " " + metric);
          if (metric > STRENGTH_THRESHOLD) {
            matches.push(new InternalMatch(node, metric));
            break;
          }
        }
          node = nodeIterator.nextNode();
      }
    }
  }
  
  function findWindowMatches(/*InternalMatch[]*/ matches,
                             /*Keywords*/ keywords) {
    var winMediator = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                      .getService(Components.interfaces.nsIWindowMediator);
    var winIterator = winMediator.getZOrderDOMWindowEnumerator("", true);
    if (!keywords || !keywords.length) {
      while (winIterator.hasMoreElements()) {
        var win = winIterator.getNext();
        var im = new InternalMatch(win, 0);
        matches.push(im); }
    }
    else {
      while (winIterator.hasMoreElements()) {
        var win = winIterator.getNext();
        var textToSearch = win.document.title;
        var metric = keywords.match(textToSearch);
        if (metric > STRENGTH_THRESHOLD) {
         //debug(win.document.title);
          var im = new InternalMatch(win, metric);
          matches.push(im); }
      }
    }
    return matches;
  }
  
  /**
   * Find input elements (textboxes, checkboxes, radiobuttons)
   * by looking for keywords in nearby labels.
   * 
   */
  function findCaptionedNodes(
                      /*InternalMatch[]*/ matches,
                      /*Document*/ doc,
                      /*Keywords*/ keywords, 
                      /*function(node)->boolean*/ nodeTypeFilter,
                      /*map{left,right,above,below}*/ matchFactors,
                      /*optional Range*/ context) {
    // search only down inside context
    var root = getFindRoot(doc, context);
    var filter = makeFilter(nodeTypeFilter, context);

    // collect all nodes of the specified type in an array, since
    // we may have to iterate over them several times
    var nodes = [];  
    var nodeIterator = findElements(root, filter)
    var node = nodeIterator.nextNode();
    while (node) {
      nodes.push(node);
      node = nodeIterator.nextNode();
    }
    
   //if no pattern specified, return all nodes of the specified type
    if (!keywords || !keywords.length) {
    if (Pattern.debugPatternMatching) debug("returning all nodes of specified type");
      for (var i = 0; i < nodes.length; ++i) {
        var node = nodes[i];
        matches.push(new InternalMatch(node, 0));
     }
     if (Pattern.debugPatternMatching) debug("found " + matches.length + " such nodes");
     
      return matches;
    }

/* Now handled by findFieldsByInternalName    
    // look for form element with exact name
    nodes = info.getFormElements(pattern);
    for (var i = 0; i < nodes.length; i++) {
      if (filter(nodes[i])) {
        matches.push(new InternalMatch(nodes[i], 3));
      }
    }
*/

    // now look for text blobs that heuristically
    // match the pattern
    matchingBlobs = [];
    var blobIterator = new TextBlobIterator(root);
    var blob = null;
    while (blob = blobIterator.next()) {
      if (Pattern.debugPatternMatching) debug("testing text blob: " + blob);
      var metric = keywords.match(blob.value);
      if (metric <= STRENGTH_THRESHOLD) continue;
      if (Pattern.debugPatternMatching) debug("matched with strength " + metric);
      
      // Found a matching text blob.
      // Now find input elements that might be associated with it.
      
      // First, see if blob is inside a LABEL element.
      var label = findLabelContaining(blob.firstNode);
      if (label != null) {
        var node = doc.getElementById(label["for"]);
        if (node != null && filter(node)) {
          if (Pattern.debugPatternMatching) debug("best match is labeled node: " + node);
          matches.push(new InternalMatch(node, LABEL_FACTOR * metric));
          continue;
        }
      }
    
      // otherwise, use the blob's position on the page to
      // find the closest input element to it
      var boxLabel = Box.forNode(blob.firstNode);
      if (Pattern.debugPatternMatching) debug("boxLabel=" + boxLabel);
      
      // while we're iterating through the nodes,
      // keep track of the single best candidate for this text blob    
      var bestNode = null;
      var bestStrength = 0;
      function maximizeMatch(node, strength) {
          if (strength > bestStrength) {
            bestNode = node;
            bestStrength = strength;
          }
      }
      
      for (var j = 0; j < nodes.length; j++) {
        var node = nodes[j];

        // Next, see if blob is nested inside the node itself (e.g., SELECT elements).
        if (goog.dom.contains(node, blob.firstNode)) {
          if (Pattern.debugPatternMatching) debug("found blob " + blob + " nested inside " + node);
          bestStrength = NESTED_FACTOR;
          bestNode = node;
          break;
        }
        
        var boxNode = Box.forNode(node);
        if (Pattern.debugPatternMatching) debug("boxNode=" + boxNode);

        // search for a relationship between boxLabel and boxNode, with increasing
        // amounts of tolerance.
        var relation;
        var tolerance;
        relation = boxLabel.relatedTo(boxNode,tolerance=-5);
        if (!relation) relation = boxLabel.relatedTo(boxNode,tolerance=0);
        if (!relation) relation = boxLabel.relatedTo(boxNode,tolerance=5);        
        if (!relation || relation == "intersects") continue;
        
        var distance, overlap;
        switch (relation) {
          case "left":
            distance = computeDistance(boxNode.x1, boxLabel.x2);
            overlap = computeOverlap(boxNode.y1, boxNode.y2, boxLabel.y1, boxLabel.y2);
            break;
          case "right":
            distance = computeDistance(boxLabel.x1, boxNode.x2);
            overlap = computeOverlap(boxNode.y1, boxNode.y2, boxLabel.y1, boxLabel.y2);               
            break;
          case "above":
            distance = computeDistance(boxNode.y1, boxLabel.y2);
            overlap = computeOverlap(boxNode.x1, boxNode.x2, boxLabel.x1, boxLabel.x2);
            break;
          case "below":
            distance = computeDistance(boxNode.y1, boxLabel.y2);
            overlap = computeOverlap(boxNode.x1, boxNode.x2, boxLabel.x1, boxLabel.x2);               
            break;
        }
        
        var strength = 0;
        strength += KEYWORD_FACTOR * metric;
        strength += POSITION_FACTOR * matchFactors[relation];
        strength += DISTANCE_FACTOR * distance;
        strength += OVERLAP_FACTOR * overlap;
        if (Pattern.debugPatternMatching) debug(relation + " distance=" + distance + " overlap=" + overlap + " strength=" + strength + " " + flattenDom(node)[0]);
        maximizeMatch(node, strength);        
      }
  
      // take the closest node and add it as a match    
      if (bestNode != null) {
          if (Pattern.debugPatternMatching) debug("best match is " + bestStrength + " " + flattenDom(bestNode)[0]);
          matches.push(new InternalMatch(bestNode, bestStrength));
      }
    }  
  
    // computes strength as an inverse function of distance between two pixel coordinates;
    // 0 == infinite pixel distance, 1 = 0 pixel distance
    function computeDistance(a, b) {
      var diffPixels = (a < b) ? (b-a) : (a-b);
      var dist = 1 - (diffPixels / 400);
      if (dist < 0) dist = 0;
      return dist;
    }
    
    // computes fraction of [c,d] that is overlapped by [a,b]
    //    e.g. computeOverlap(0,4,  -2, 1)  = 0.333   since [0,4] and [-2,1] intersect in [0,1] whose
    //         length is one third of [-2,1]'s length
    function computeOverlap(a,b,  c,d) {
      var maxAC = (a < c) ? c : a;
      var minBD = (b < d) ? b : d;
      return (minBD - maxAC) / (d-c);
    }
      
    // returns <LABEL> element containing given node, or null if none
    function findLabelContaining(node) {
      while (node != null && upperCaseOrNull(node.tagName) != "LABEL") {
        node = node.parentNode;
      }
      return node;
    }
    
    
  } // closing brace for findCaptionedNodes

  // filter out nodes that are invisible or outside the context
  function makeFilter(/*Node->boolean*/ nodeTypeFilter, /*optional Range*/ context) {
    function visibleFilter(node) { 
      return nodeTypeFilter(node) && isVisible(node); 
    };
    if (!context) return visibleFilter;
    
    function contextFilter(node) {
      return visibleFilter(node) && isNodeInRange(node, context);
    }
    return contextFilter;
  }
  
  function isBetween(lower, middle, upper) {
    return (lower <= middle && middle <= upper);
  }
  
  /**
   * Finds forms and adds them to matches array.
   */  
  function findForms(/*InternalMatch[]*/ matches, 
                     /*Document*/ doc, 
                     /*Keywords*/ keywords,
                     /*optional Range*/ context) {
    var forms = doc.forms;
    for (var i = 0; i < forms.length; i++) {
      var form = forms[i];
      var range = nodeToRange(form);
      var strength = keywords.match(range.toString());
      matches.push(new InternalMatch(form, strength));
    }
  }

  function findTables(/*InternalMatch[]*/ matches,
                      /*Document*/ doc,
                      /*String*/ pattern,
                      /*optional Range*/ context) {
    var root = getFindRoot(doc, context);
    var tables = root.getElementsByTagName('table');
    for (var i = 0; i < tables.length; ++i) {
      var table = tables[i];
      matches.push(new InternalMatch(table, 1.0));
    }
  }
  
  function findRows(/*InternalMatch[]*/ matches,
                      /*Document*/ doc,
                      /*String*/ pattern,
                      /*optional Range*/ context) {
    var root = getFindRoot(doc, context);
    if (upperCaseOrNull(root.tagName) != 'TABLE') throw new Error("cannot look for rows if not a table");
    var rows = root.rows;
    for (var i = 0; i < rows.length; ++i) {
      matches.push(new InternalMatch(rows[i], 1.0));
    }
  }

  function findCells(/*InternalMatch[]*/ matches,
                    /*Document*/ doc,
                    /*String*/ pattern,
                    /*optional Range*/ context) {
    var root = getFindRoot(doc, context);
    if (upperCaseOrNull(root.tagName) != 'TR') throw new Error("cannot look for cells if not a row");
    var cells = root.cells;
    for (var i = 0; i < cells.length; ++i) {
      matches.push(new InternalMatch(cells[i], 1.0));
    }
  }
  
  /**
   * Given a match for a cell, returns as successive matches
   * intersecting cells below the cell originally matched.
   */
  function findColumns(/*InternalMatch[]*/ matches,
                      /*Document*/ doc,
                      /*String*/ pattern,
                      /*optional Range*/ context) {
    var root = getFindRoot(doc, context);
    if (upperCaseOrNull(root.tagName) != 'TD') throw new Error("need a cell to get its column")

    var targetRow = Table.getParentRow(root);
    var sib = Table.getNextRow(targetRow);
    while(sib != null){
      matched = Table.returnSimilar(root,sib)
      if(matched != null) matches.push(new InternalMatch(matched, 1));
      sib = Table.getNextRow(sib)
    }
  }
  
  /**
   * Finds images and adds them to matches array.
   */  
  function findImages(/*InternalMatch[]*/ matches, 
                     /*Document*/ doc, 
                     /*Keywords*/ keywords,
                     /*optional Range*/ context) {
    findCaptionedNodes(matches, doc, keywords, isSignificantImage, IMAGE_FACTORS, context);
  }

  /**
   * 
   */
  function getFindRoot(/*Document*/ doc, /*optional Range*/ context) {
  if (context) {return rangeToContainer(context);}
    else if (doc.body) {return doc.body;}
    else if (instanceOf(doc, XULDocument)) {return doc;}
    else {return doc.documentElement;}
  }
  
//  function findInAllFrames(/*Document*/doc, /*Match Object*/ matches) {
//  //TODO:also look for iframes
//    if (doc.getElementsByTagName('browser') == 0) {return matches;}
//    else {
//      var allFrames = doc.getElementsByTagName('browser');
//      for (var i=0; i<allFrames.length; i++) {
//        tempMatches = find(/*Document*/ allFrames[i], /*pattern*/ pattern, /*types*/ types, /*context*/ context);
//        for (var j=0; j<tempMatches.length; j++) {
//          matches.push(tempMatches[j]);
//        }
//      }
//      return matches;
//    }
//  }
}

// initialize this package
Pattern();


/**
 * Represents a potential pattern match
 */
function InternalMatch(/*Node*/node, /*number*/ strength) {
  this.node = node;
  this.strength = strength;
}

InternalMatch.prototype.toString = function() {
  return '[' + this.strength.toFixed(2)
             + ': ' + this.node
             +' ]';
}

// Mozilla XPath reference: http://www-xray.ast.cam.ac.uk/~jgraham/mozilla/xpath-tutorial.html

/**
 * @param xpathExpression {string}
 * @param details {object} OPTIONAL 
 */
function XPath(/*string*/ xpathExpression, 
               /*optional object*/ details) {
  this._xpathExpression = xpathExpression;
  this._namespaceResolver = null;
  this._resultType = XPathResult.ANY_TYPE;
  if (details) {
    var fields = ["_namespaceResolver", "_resultType"];
    for (var i = 0; i < fields.length; ++i) {
      var f = fields[i];
      if (!!details[f]) this[f] = details[f];
    }
  }
}

XPath.prototype.xpathExpression getter = function() { return this._xpathExpression; }
XPath.prototype.namespaceResolver getter = function() { return this._namespaceResolver; }
XPath.prototype.resultType getter = function() { return this._resultType; }

XPath.prototype.toString = function() {
  return "XPath: " + this.xpathExpression;
}

function generateXPath(/*Node*/ target, includeClasses) {
    var expression = "";
    var currentNode = target;
    
    while (currentNode && currentNode.parentNode) {
        var children = currentNode.parentNode.childNodes;
        
        var count = 0;
        for (var i = 0; i < children.length; i++) {
            if (children[i].nodeName == currentNode.nodeName
                  && children[i].nodeType != 10) { // ignore doctype declarations
                count++;
            }
            
            if (children[i] == currentNode) {
                break;
            }
        }
        
        if (includeClasses && currentNode.className){
            expression = '[@class="' + currentNode.className + '"]' + expression;
        }
        
        expression = "/" + currentNode.nodeName + "[" + count + "]" + expression;
        currentNode = currentNode.parentNode;
    }
    //debug(target.nodeValue + " " + target.ownerDocument.nodeName + " " + target.ownerDocument.defaultView);
    return new XPath(expression);
}


/**
 * Regular expression pattern matching on DOM text.
 *
 * Searches text blobs inside root for the given regular expression.
 * (Match can't cross text blob boundaries.)
 */
function findRegexp(/*Document*/ doc, /*RegExp*/ pattern, /*optional Range*/ context) {
  var root = doc;
  if (context) {
    // FIX: really should search only inside range
    root = rangeToContainer(context);
    doc = root.ownerDocument;
  }
  var iter = new RegexpIterator(root, pattern);  
  var range;
  var ranges = [];
  while (range = iter.next()) {
    ranges.push(range);
  }
  
  var lastMatch = EMPTY_MATCH;
  for (var i = ranges.length-1; i >= 0; --i) {
    range = ranges[i];
    //debug(range.toString());
    lastMatch = new Match(range.toString(), // FIX: need to return HTML if range spans several nodes
                          lastMatch,
                          null,
                          range,
                          doc,
                          i,  
                          true);
    // transfer paren group matches from Range to Match object
    lastMatch.groups = [];
    for (var j = 0; j < range.length; ++j) {
      lastMatch.groups.push(range[j]);
    }
  }
  return lastMatch;
}

 
/*
 * Iterator that yields a Range object r for each match, which is further
 * augmented so that r[0] = text of full match, r[1] = text of first parenthesized expr,
 * etc.
 *
 * Example: finding email addresses:
 *   var iter = new RegexpIterator(document, /(\W+)@(\W+)/);
 *   var range;
 *   while (range = iter.next()) {
 *     var emailAddress = range[0]); // e.g. "rcm@mit.edu"
 *     var username = range[1]; // e.g. "rcm"
 *     var hostname = range[2]; // e.g. "mit.edu"
 *   }
 */
function RegexpIterator(/*Document|Node*/ root, /*RegExp*/ regexp) {
  // make sure regexp is a global
  if (!regexp.global) {
    regexp = new RegExp(regexp.source, "g" + (regexp.ignoreCase ? "i" : ""));
  }
  this.regexp = regexp;
  this.iter = makeBlobIterator(root);
  this.doc = this.iter.root.ownerDocument;
  this.iteratorDone = false;
  this.blob = null;  
}

RegexpIterator.prototype.next = function() {
  if (this.iteratorDone) return null;
  
  while (true) {
    if (!this.blob) {
      this.blob = this.iter.next();
      if (!this.blob) {
        iteratorDone = true;
        return null;
      }
      
      this.node = null;
      this.iNode = -1;
      this.iLastNode = this.blob._nodes.length - 1;
      this.rawStartOfNode = 0;
      this.rawEndOfNode = 0;
    }
    
    var m = this.regexp.exec(this.blob.value);
    if (!m) {
      this.blob = null;
    } else {
      var len = m[0].length;
      if (!len) ++this.regexp.lastIndex; // make sure we don't loop forever
      
      //debug(m);
      var startOffset = this.cookedToNodeOffset(m.index, true);
      var startNode = this.node;
      //debug(startNode + "@" + startOffset);
      var endOffset = this.cookedToNodeOffset(m.index + len, !len);
      var endNode = this.node;
      //debug(endNode + "@" + endOffset);

      var range = this.doc.createRange();
      range.setStart(startNode, startOffset);
      range.setEnd(endNode, endOffset);

      // copy group matches into returned range
      for (var i = 0; i < m.length; ++i) {
        range[i] = m[i];
      }
      range.length = m.length;

      return range;
    }
  }
}

RegexpIterator.prototype.cookedToNodeOffset = function(/*int*/ cooked, /*boolean*/ roundUp) {
  //debug("cooked=" + cooked);
  var raw = this.blob._map.cookedToRaw(cooked);
  //debug("raw=" + raw);
  while ((raw > this.rawEndOfNode || (roundUp && raw == this.rawEndOfNode))
         && this.iNode < this.iLastNode) {
    //debug(rawStartOfNode + "-" + rawEndOfNode);
    this.node = this.blob._nodes[++this.iNode];
    this.rawStartOfNode = this.rawEndOfNode;
    this.rawEndOfNode += this.node.nodeValue.length;
  }
  if (raw > this.rawEndOfNode)
    raw = this.rawEndOfNode;
  return raw - this.rawStartOfNode;
}

/**
 * Make an iterator over the text blobs in the DOM, recording
 * extra information so that regexp matches can be
 * translated to Ranges.
 */
function makeBlobIterator(/*Document|Node*/ root) {
  var iter = new TextBlobIterator(root);

  // override iterator's template methods to record
  // extra info we need in the blob:
  //    _map: a DeleteMap recording where spaces were removed by condenseSpaces()
  //    _nodes: array of all text nodes that contributed to the blob, in order
  
  var superMakeBlob = iter._makeBlob;
  iter._makeBlob = function() {
    var blob = superMakeBlob();
    blob._nodes = [];
    return blob;
  }

  iter._getTextOfNode = function(/*Node*/ node) {
    // only use text nodes for regexp searching
    if (node.nodeType == Node.TEXT_NODE) return node.nodeValue;
    else return null;
  }    

  var superAddNodeToBlob = iter._addNodeToBlob;
  iter._addNodeToBlob = function(/*TextBlob*/blob, /*String*/ text, /*Node*/ node) {
    superAddNodeToBlob(blob, text, node);
    blob._nodes.push(node);
  }


  iter._finishBlob = function(/*TextBlob*/blob) {
    blob._map = new DeleteMap();
    blob.value = condenseSpaces(blob._stringBuffer.toString(), blob._map);
    //delete blob._stringBuffer;
  }

  return iter;
}

/*
var iter = new Chickenfoot.RegexpIterator(document, /|/);
var r;
while (r = iter.next()) {
  output(r);
  output(r[1]);
  output(r[2]);
}
*/

goog.require('goog.string');

function Table() {
  // exports
  Table.findColumn = findColumn;
  Table.findRow = findRow;
  Table.getParentRow = getParentRow;
  Table.getNextRow = getNextRow;
  Table.returnSimilar = returnSimilar;
  
  function findColumn(/*InternalMatch[]*/ matches, /*Document*/ doc, /*Keywords*/ keywords, /*optional Range*/ context){
    /**
     *  this function maps over all the successive rows of cell
     *  and finds the nodes that intersect with cell.
     */
  
    var query = new TC("cell starts with '" +
        goog.string.trim(keywords.pattern) + "'");
    var cell = Pattern.find(doc, query);
    cell = cell.element
  
    var targetRow = getParentRow(cell);
    var sib = getNextRow(targetRow);
    while(sib != null){
      matched = returnSimilar(cell,sib)
      if(matched != null) {
        matches.push(new InternalMatch(matched, 1));
      }
      sib = getNextRow(sib)
    }
  }
  
  function findRow(/*InternalMatch[]*/ matches, /*Document*/ doc, /*Keywords*/ keywords, /*optional Range*/ context){
    /**
     *  this function maps over all the successive rows of cell
     *  and finds the nodes that intersect with cell.
     *  TODO add hook if no pattern is passed...
     */
  
    var query = new TC("cell contains '" +
        goog.string.trim(keywords.pattern) + "'");
    var cell = Pattern.find(doc, query);
    cell = cell.element
    //TODO error checking if match is null or has multiple results
  
    var sib = nextCell(cell);
    while(sib != null){
      matches.push(new InternalMatch(sib, 1));
      sib = nextCell(sib);
    }
  }
  
  function exposeNotNull(obj){
    for(var name in obj){
      var value = obj[name]
      if(value != "")
        debug(name+" : "+value)
    }
  }
  
  function getFirstRow(table){
    var row = table.firstChild;
    do{
      if(row.nodeType == 1 && upperCaseOrNull(row.tagName) == "TR")
        return row
    }while(row = row.nextSibling);
  }
  
  function getParentRow(cell){
    var parent = cell.parentNode;
    if(upperCaseOrNull(parent.tagName) == "TR")
      return cell.parentNode
    else if(upperCaseOrNull(cell.tagName) == "TABLE")
      return null
    else
      return getParentRow(cell)
  }
  
  function getParentTable(node){
    if(node.nodeType == 1 && upperCaseOrNull(node.tagName) == "TABLE"){ return node }
    else{ return getParentTable(node.parentNode) }
  }
  
  function getBoxForNode(node){
    var doc = node.ownerDocument;
    var box = doc.getBoxObjectFor(node);
    return box;
  }
  
  function intersects(node1, node2){
    /**
     *  intersects compares the left and right x offsets 
     *  for node1 and node2 and returns true if they 
     *  intersect each other.
     */
    var a = getBoxForNode(node1);
    var b = getBoxForNode(node2);
    var aLeft = a.x; var aRight = a.x + a.width;
    var bLeft = b.x; var bRight = b.x + b.width;
    
    if(aLeft >= bLeft && aLeft <= bRight)
      return true;
    else if(aRight >= bLeft && aRight <= bRight)
      return true;
    else return false;
  }
  
  function getNextRow(row){
    /**
     *  This function currently only works with html
     *  tables, not with things that appear tabular via css
     *  styling.
     */
    var next = row.nextSibling;
    if(next != null){
      if(next.nodeType == 1){
        if(upperCaseOrNull(next.tagName) == "TR"){
          return next;
        }
      }
      return getNextRow(next)
    }
    return null;
  }
  
  function returnSimilar(cell,row){
    /**
     *  This function takes a target cell and scours a given row until
     *  it finds a node that intersects the cell
     */
    var child = row.firstChild;
    for(var child = row.firstChild; child != null; child = child.nextSibling){
      if(child.nodeType == 1){
        if(intersects(cell,child)){
          return child;
        }
      }
    }
  }
  
  function nextCell(cell){
    var sib = cell.nextSibling;
    while(sib != null){
      if(sib.nodeType == 1)
        return sib
      sib = sib.nextSibling;
    }
  }
  
  function findSucc(cell){
    /**
     *  this function maps over all the successive rows of cell
     *  and finds the nodes that intersect with cell.
     */
    var targetRow = getParentRow(cell);
    var sib = getNextRow(targetRow);
    while(sib != null){
      matched = returnSimilar(cell,sib)
      if(matched != null)
        debug(matched.innerHTML)
      sib = getNextRow(sib)
    }
  }
  
  function isLeaf(table){
    function onlyElements(n){
      if(n.nodeType == 1) return NodeFilter.FILTER_ACCEPT
      else return NodeFilter.FILTER_SKIP
    }
    var tree = document.createTreeWalker(table,NodeFilter.SHOW_ELEMENT,onlyElements,false)
    while((branch = tree.nextNode()) != null){
      if(upperCaseOrNull(branch.tagName) == "TABLE")
        return false
    }
    return true
  }
  
  function isTable(table){
    var text = 0; var element = 0;
    function isTabular(n){
      if(n.nodeType == 1){
        switch(upperCaseOrNull(n.tagName)){
          case "TBODY": return true; break;
          case "TR":return true;break;
          case "TD":return true;break;
          case "TH":return true;break;
          default: return false;
        }
      }
      return false
    }
    function textAndElements(n){
      if(n.nodeType == Node.TEXT_NODE || !isTabular(n)) return NodeFilter.FILTER_ACCEPT
      else return NodeFilter.FILTER_SKIP
    }
    var tree = document.createTreeWalker(table,NodeFilter.SHOW_ALL,textAndElements,false)
    while((branch = tree.nextNode()) != null){
      if(branch.nodeType == Node.TEXT_NODE)
        text += 1;
      else
        element += 1;
    }         
    if(text > element)
      return true
    else
      return false
  }
}

// initialize this package
Table();

goog.require('goog.string');
goog.require('goog.style');

// don't attempt labelling if node count exceeds this
const RECORDER_NODE_THRESHOLD = 2200; 

/**
 * Returns the total number of nodes in the document, including nodes in other
 * frames in the document.
 * @param doc Document
 * @return int total number of nodes
 */
function getDocumentNodeCount(/*Document*/ doc) {
  var allDocuments = getAllVisibleFrameDocuments(doc);
  var nodeCount = 0;
  for (var i = 0; i < allDocuments.length; i++) {
    nodeCount += allDocuments[i].evaluate(
      'count(//node())', allDocuments[i], null, XPathResult.ANY_TYPE, null)
      .numberValue;
  }
  return nodeCount;
}


/**
 * Takes an event that occurs on an HTML node, and generates an object describing the event.
 * Throws an exception if the event is unknown.
 */
function generateCommandDetails(/*Element*/ e, /*String*/ eventType) {
  var action = null;
  var label = null;
	var value = null;
	var xpath = null;
  var targetType = null;
	var location = null;
	var ordinal = null;
  
  if (eventType == "click") {
    e = getClickableTarget(e);
    action = Command.CLICK_COMMAND;
    if (ElementTypes.getType(e) == ElementTypes.OTHER) {
      e = getContainedTextOrImage(e);
    }
  } else if (eventType == "change") {
    if (!ElementTypes.isTextbox(e) && !ElementTypes.isRadioButton(e) 
        && !ElementTypes.isCheckbox(e) && !ElementTypes.isListbox(e)) {
		  while (e.nodeName != "BODY") {
		    var forNodeId = e.getAttribute ? e.getAttribute("for") : null;
		    if (forNodeId) {
		      e = e.ownerDocument.getElementById(forNodeId);
		      break;
		    }
		      e = e.parentNode;
		    }
		}
    if (ElementTypes.isTextbox(e)) {
        action = Command.ENTER_COMMAND;
        value = e.value;
		} else if (ElementTypes.isRadioButton(e)) {
		    action = Command.CHECK_COMMAND;
		    value = "true";
		} else if (ElementTypes.isCheckbox(e)) {
		    action = Command.CHECK_COMMAND;
		    value = e.checked + "";
		} else if (ElementTypes.isListbox(e)) {
		    action = Command.CHOOSE_COMMAND;
		    value = e.options[e.selectedIndex].textContent;
		}	
  } else if (eventType == "load") {
      var doc = e.ownerDocument
      if (!doc) throw new Error("not an HTML document load")
      var url = getVisibleHtmlWindow(doc.defaultView).location.toString();
      action = Command.GO_COMMAND;
      value = url;
  } else if (eventType == "keypress") {
      action = Command.KEYPRESS_COMMAND;
  } else {
      throw new Error("unknown command type: " + eventType);
  }
    
  if (eventType != "load") {
    targetType = ElementTypes.getType(e);
    xpath = generateXPath(e).xpathExpression;
        
    // get number of nodes in DOM
    var nodeCount = getDocumentNodeCount(e.ownerDocument);
    
    // skip recorderFind and labelling if DOM has too many nodes
    if (nodeCount <= RECORDER_NODE_THRESHOLD) {
      label = getLabelForElement(e);
      var nodes = 
        recorderFind(e.ownerDocument, label, targetType, null, true, false);
      if (nodes.length > 1) {
        for (var i=0; i<nodes.length; i++) {
          if (nodes[i].element == e) {
            ordinal = i+1;
            break;
          }
        }
      }
    }       
  } 
  return {action: action, label : label, value : value, targetXPath: xpath, 
          targetType : targetType, ordinal : ordinal};
}

/* takes a DOM Element node and an event type, and returns a keyword command
string that would correspond to an eventType event on node */
function generateKeywordCommand(/*Element*/ e, /*String*/ eventType) {
    var details = generateCommandDetails(e, eventType);
    return generateKeywordCommandFromDetails(details);
}

/* takes a DOM Element node and an event type, and returns a chickenfoot command
string that would correspond to an eventType event on node (if checkCorrectness is true then
it also checks that the generated command will match the correct node in e's document... if it
doesn't, the chickenfoot command will use e's xpath */
function generateChickenfootCommand(/*Element*/ e, /*String*/ eventType, /*Boolean*/ checkCorrectness) {
    if (checkCorrectness == undefined) checkCorrectness = true;
    
    var details = generateCommandDetails(e, eventType);
    var c = generateChickenfootCommandFromDetails(details);

    if (checkCorrectness) {
        var label = getLabel(details);
        var m = Pattern.find(e.ownerDocument, label);

        if (m.count == 1) {
          // one of the ancestors or siblings is the right node
          // hack-ish because e and m.element don't match because of text labels
          // assuming good labelling
          var currentNode = e;
          
          // check siblings
          var siblings = currentNode.parentNode.childNodes;
          for (var i = 0; i < siblings.length; i++) {
            if (siblings[i] == e) {
              return c;
            }
          }
          
          // check ancestors
          while (currentNode) {
            if (currentNode == m.element) {
              return c;
            } else {
              currentNode = currentNode.parentNode;
            }
          }
        }
        details.label = "";
        return generateChickenfootCommandFromDetails(details);
    }
    
    return c;
    
    function getLabel(/*CommandDetails*/ details) {
        var label = "";
        
        if (details.label == "") {
	        label = "new XPath(" + toQuotedJavascriptString(details.targetXPath) + ")";
    	  } else {
    	    label = details.label;
    	    
    	    if (details.ordinal) label = getOrdinalText(details.ordinal) + " " + label;

          if (details.action == Command.CLICK_COMMAND && details.targetType == ElementTypes.BUTTON) label += " button";
            else if (details.action == Command.CLICK_COMMAND && details.targetType == ElementTypes.LINK) label += " link";
            else if (details.action == Command.ENTER_COMMAND) label += " textbox";
        	else if(details.targetType == ElementTypes.RADIO_BUTTON) label += " radiobutton";
        	else if(details.targetType == ElementTypes.CHECK_BOX) label += " checkbox";
        	else if (details.action == Command.CHOOSE_COMMAND) label += " listbox";
    	}
    	
    	return label;
    }
}

function generateChickenfootCommandFromDetails(/*CommandDetails*/ details) {
  var command = null;
	var label;
	
	if (details.label == "") {
	    label = "new XPath(" + toQuotedJavascriptString(details.targetXPath) + ")";
	}
	else {
	    label = details.label;
        if (!label) label = "";
	    if (details.ordinal) label = getOrdinalText(details.ordinal) + " " + label;
	    if (details.action == Command.CLICK_COMMAND && details.targetType == ElementTypes.BUTTON) label += " button";
	    if (details.action == Command.CHOOSE_COMMAND) label += " listbox";
	    label = toQuotedJavascriptString(label);
	}
	
	if (details.action == Command.CLICK_COMMAND) {
        command = "click(" + label + ")";
    }
    else if (details.action == Command.ENTER_COMMAND) {
		command = "enter(" + label + ", " + toQuotedJavascriptString(details.value) + ")";
    }
	else if(details.targetType == ElementTypes.RADIO_BUTTON) {
	    command = "check(" + label + ")";
	}
	else if(details.targetType == ElementTypes.CHECK_BOX) {
        if (details.value == "true") command = "check(" + label + ")";
        else command = "uncheck(" + label + ")";
	}
	else if (details.action == Command.CHOOSE_COMMAND) {
		command = "pick(" + label + ", " + toQuotedJavascriptString(details.value) + ")";
    }
    else if (details.action == Command.GO_COMMAND) {
        command = "go(" + toQuotedJavascriptString(details.value) + ")";
    }
    
    if (!command) throw new Error("unable to generate keyword command from details: " + details);
    
    return command;
}

function generateKeywordCommandFromDetails(/*CommandDetails*/ details) {
	var command = null;
	var label = details.label == "" ? details.targetXPath : details.label;
	
	if (details.ordinal) label = getOrdinalText(details.ordinal) + " " + label;
	
	if (details.action == Command.CLICK_COMMAND) {
        command = "click " + label;
    }
    else if (details.action == Command.ENTER_COMMAND) {
        var val = details.value;
		command = "type " + toQuotedJavascriptString(val) + " into " + label + " textbox";
    }
	else if(details.targetType == ElementTypes.RADIO_BUTTON) {
	    command = "check " + label;
	}
	else if(details.targetType == ElementTypes.CHECK_BOX) {
        if (details.value == "true") command = "check " + label;
        else command = "uncheck " + label;
	}
	else if (details.action == Command.CHOOSE_COMMAND) {
		command = "choose " + details.value + " from " + label + " listbox";
    }
    else if (details.action == Command.GO_COMMAND) {
        command = "go to " + details.value;
    }
    
    if (!command) throw new Error("unable to generate keyword command from details: " + details);

	return command;
}

/** if node is not clickable but is nested inside a clickable element, return the clickable element ancestor;
otherwise return node */
function getClickableTarget(/*Element*/ e) {
    var currentNode = e;
    
    while (currentNode && currentNode.nodeName != "BODY") {
        if (ElementTypes.isClickable(currentNode)) {
            return currentNode;
        }
            
        currentNode = currentNode.parentNode;
    }
    
    return e;
}

function getContainedTextOrImage(/*Element*/ e) {
    var r = xpath(".//text() | .//img", e);
    var node = r.iterateNext();
    
    while (node) {
        if (node.textContent.match(/\S/)) {
            return node;
        }
        else if (node.getAttribute && node.getAttribute("alt") && node.getAttribute("alt").match(/\S/)) {
            return node;
        }       
        else if (node.getAttribute && node.getAttribute("title") && node.getAttribute("title").match(/\S/)) {
            return node;
        }  
        node = r.iterateNext();
    }
    
    return e;
    
    function xpath(x, root) {
        return root.ownerDocument.evaluate(x, root, null, null, null);
    }
}

function getOrdinalText(/*Number*/ pos) {
    if (pos == 1) return "first";
    else if (pos == 2) return "second";
    else if (pos == 3) return "third";
    else if (pos == 4) return "fourth";
    else if (pos == 5) return "fifth";
    else if (pos == 6) return "sixth";
    else if (pos == 7) return "seventh";
    else if (pos == 8) return "eigth";
    else if (pos == 9) return "ninth";
    else if (pos == 10) return "tenth";
    else if (pos % 10 == 1) return pos + "st";
    else if (pos % 10 == 2) return pos + "nd";
    else if (pos % 10 == 3) return pos + "rd";
    else return pos + "th";
}

function getLabelForElement(/*Element*/ e) {
    var type = ElementTypes.getType(e);
    var label = "";
  
    if (type == ElementTypes.TEXT) {
        if (e.textContent.match(/\S/)) label = e.textContent;
    }
    else if (type == ElementTypes.LINK) {
        if (e.textContent.match(/\S/)) label = e.textContent;
    }
    else if (type == ElementTypes.LIST_ITEM) {
        if (e.textContent.match(/\S/)) label = e.textContent;
    }
    else if (type == ElementTypes.BUTTON) {
        if (e.textContent.match(/\S/)) label = e.textContent;
        else if (e.getAttribute("value") && e.getAttribute("value").match(/\S/)) label = e.getAttribute("value")
        else if (e.getAttribute("title") && e.getAttribute("title").match(/\S/)) label = e.getAttribute("title");
    }
    else if (type == ElementTypes.IMAGE) {
        var alt = e.getAttribute("alt");
        var title = e.getAttribute("title");
        if (alt && alt.match(/\S/)) label = alt;
        else if (title && title.match(/\S/)) label = title;
    }
    else if (type == ElementTypes.RADIO_BUTTON || type == ElementTypes.CHECK_BOX) {
        //var r = xpath("following::text()[..[name() !='SCRIPT'] and ..[name()!='OPTION']]", e);
        //var r = xpath("following::text()[..[name() !='SCRIPT'] and ..[name()!='OPTION']]", e);
        var r = xpath("following::text()", e);

        var l = r.iterateNext();

        while (l) {
            if (l.textContent.match(/\S/) && l.parentNode.nodeName != "SCRIPT" && l.parentNode.nodeName != "OPTION") {
                label += l.textContent + " ";
                break;
            }
            l = r.iterateNext();
        }
        
        l = l.nextSibling ? l.nextSibling : l.parentNode.nextSibling;
        
        while (l) {
            if (l.nodeType == Node.TEXT_NODE && l.textContent.match(/\S/)) {
                label += l.textContent + " " ;   
            }
            else if (!TextBlob.isFlowTag[l.nodeName] && l.nodeName != "LABEL") {
                break;
            }
            
            if (l.childNodes.length > 0 && l.textContent.match(/\S/)) l = l.childNodes[0];
            else if (l.nextSibling) l = l.nextSibling;
            else {
                var newl = l.parentNode.nextSibling;
                
                while (!newl) {
                    if (!l.parentNode) break;
                    l = l.parentNode;
                    newl = l.nextSibling;
                }
                
                l = newl;
           }
        }
        
    }
    else if (type == ElementTypes.TEXT_BOX || type == ElementTypes.LIST_BOX || type == ElementTypes.PASSWORD_BOX) {
        var l = getClosestLabelTo(e);
        if (l != "") label = l;
    }
    else if (ElementTypes.isClickable(e)) {
        var node = getContainedTextOrImage(e);

        if (node) {
            if (ElementTypes.isText(node)) {
                if (node.textContent.match(/\S/)) label = node.textContent;
            }
            else if (node.getAttribute("alt") && node.getAttribute("alt").match(/\S/)) {
                label = node.getAttribute("alt");
            }       
            else if (node.getAttribute("title") && node.getAttribute("title").match(/\S/)) {
                label = node.getAttribute("title");
            } 
        } 
    }
    
    label = removeExtraWhitespace(label);
    
    return label;
    
    function xpath(x, root) {
        return root.ownerDocument.evaluate(x, root, null, null, null);
    }
}

/**
 * Returns the offset of the center of the given element with respect to the root document
 * @param Element element 
 * @return int[] = [offsetLeft, offsetTop]
 */
function getElementOffsets(/*Element*/ e) {
  var currentElement = e;
  var offsetLeft = 0;
  var offsetTop = 0;
  do {
    offsetLeft += currentElement.offsetLeft;
    if (currentElement.scrollLeft) offsetLeft-=currentElement.scrollLeft;
    offsetTop += currentElement.offsetTop;
    if (currentElement.scrollTop) offsetTop-=currentElement.scrollTop;
  } while (currentElement = currentElement.offsetParent); // assignment, not ==
  return [(offsetLeft+e.offsetWidth)/2,(offsetTop+e.offsetHeight)/2];
}

function getSquaredPixelDistance(/*Element*/ e1, /*Element*/ e2) {
  var e1Offsets = getElementOffsets(e1);
  var e2Offsets = getElementOffsets(e2);
  return Math.pow(e1Offsets[0]-e2Offsets[0],2) 
         + Math.pow(e1Offsets[1]-e2Offsets[1],2);
}

function getClosestLabelTo(/*Element*/ e) {
    var cur = e;
    while (cur && cur.nodeName != "BODY") {
  
        if (cur.previousSibling) {
            cur = cur.previousSibling

            if (cur.textContent.match(/\S/)) {
                var s = "";
 
                var x = "descendant-or-self::text()[..[name() !='SCRIPT'] and ..[name()!='OPTION']]";
                var result = e.ownerDocument.evaluate(x, cur, null, null, null);
            
                var text = result.iterateNext();
                while(text) {
                    s += " " + text.textContent;
                    text = result.iterateNext();
                }

                if (s.match(/\S/) && getSquaredPixelDistance(e,cur) <= 9000) {
                    return s;
                }
            }
        } 
        else {
            cur = cur.parentNode
        }
    }
    
    return "";
}

function removeExtraWhitespace(/*String*/ s) {
    s = goog.string.trim(s); 
    s = s.replace(/[\t\n\r ]+/g, " ");

    return s;
}

function toQuotedJavascriptString(/*String*/ s) {
    if (!s) return '""';
    return '"' + s
        .replace(/\r/g,"\\r")
        .replace(/\n/g,"\\n")
        .replace(/"/g,"\\\"")
        + '"'
}

var ElementTypes = new Object();
ElementTypes.TEXT_BOX = "text box";
ElementTypes.PASSWORD_BOX = "password box";
ElementTypes.CHECK_BOX = "check box";
ElementTypes.RADIO_BUTTON = "radio button";
ElementTypes.LIST_ITEM = "list item";
ElementTypes.LIST_BOX = "list box";
ElementTypes.BUTTON = "button";
ElementTypes.LINK = "link";
ElementTypes.IMAGE = "image";
ElementTypes.TEXT = "text";
ElementTypes.OTHER = "other";

ElementTypes.getType = function(/*Element*/ node) {
    if (ElementTypes.isPassword(node)) return ElementTypes.PASSWORD_BOX;
	else if (ElementTypes.isTextbox(node)) return ElementTypes.TEXT_BOX;
	else if (ElementTypes.isCheckbox(node)) return ElementTypes.CHECK_BOX;
	else if (ElementTypes.isRadioButton(node)) return ElementTypes.RADIO_BUTTON;
	else if (ElementTypes.isListitem(node)) return ElementTypes.LIST_ITEM;
	else if (ElementTypes.isListbox(node)) return ElementTypes.LIST_BOX;
	else if (ElementTypes.isButton(node)) return ElementTypes.BUTTON;
	else if (ElementTypes.isLink(node)) return ElementTypes.LINK;
	else if (ElementTypes.isImage(node)) return ElementTypes.IMAGE;
	else if (ElementTypes.isText(node)) return ElementTypes.TEXT;
	else return ElementTypes.OTHER;
}

/** @return true iff node is a button */
ElementTypes.isButton = function(/*Node*/ node) {
  return instanceOf(node, Node)
    && node.nodeType == Node.ELEMENT_NODE 
    && (upperCaseOrNull(node.tagName) == 'BUTTON'
        || (upperCaseOrNull(node.tagName) == 'INPUT'
            && 'type' in node
            && (node.type == 'submit'
                || node.type == 'button'
                || node.type == 'reset')));
}

/** @return true iff node is a hyperlink  */
ElementTypes.isLink = function(/*Node*/ node) {
  return instanceOf(node, Node)
    && node.nodeType == Node.ELEMENT_NODE 
    && upperCaseOrNull(node.tagName) == 'A';
}

/** @return true iff node is clickable (or at least likely to be */
ElementTypes.isClickable = function(/*Node*/ node) {
    return instanceOf(node, Node)
        && node.nodeType == Node.ELEMENT_NODE
        && (ElementTypes.isButton(node) 
            || ElementTypes.isLink(node)
            || (upperCaseOrNull(node.tagName) == 'INPUT' && node.type == 'image')
            || node.hasAttribute('onclick')
            || goog.style.getComputedStyle(node, "cursor") == "pointer");
}

/** @return true if the node is a text input */
ElementTypes.isTextbox = function(/*Node*/ node) {
  if (!instanceOf(node, Node) || node.nodeType != Node.ELEMENT_NODE) return false;
  if (upperCaseOrNull(node.tagName) == 'TEXTAREA') return true;
  if ('type' in node && upperCaseOrNull(node.tagName) == 'INPUT') {
    var type = node.type;
    if (type == 'text'
        || type == 'password'
        || type == 'file') {
      return true;
    }
  }
  return false;
}

/** @return true if node is a password input */
ElementTypes.isPassword = function(/*Node*/ node) {
    if (!instanceOf(node, Node) || node.nodeType != Node.ELEMENT_NODE) return false;
    if ('type' in node && upperCaseOrNull(node.tagName) == 'INPUT' && node.type == 'password') return true;
    return false;
}

/** @return true iff the node is a listbox (select) */
ElementTypes.isListbox = function(/*<Node>*/ node) {
  if (!instanceOf(node, Node) || node.nodeType != Node.ELEMENT_NODE) return false;
  return (upperCaseOrNull(node.tagName) == 'SELECT');
}

/** @return true iff the node is a checkbox */
ElementTypes.isCheckbox = function(node) {
  if (!instanceOf(node, Node) || node.nodeType != Node.ELEMENT_NODE) return false;
  return upperCaseOrNull(node.tagName) == 'INPUT' && node.type == 'checkbox';
}

/** @return true iff the node is a radio button */
ElementTypes.isRadioButton = function(node) {
  if (!instanceOf(node, Node) || node.nodeType != Node.ELEMENT_NODE) return false;
  return upperCaseOrNull(node.tagName) == 'INPUT' && node.type == 'radio';
}

/** @return true iff the node is a listitem (option) */
ElementTypes.isListitem = function(/*Node*/ node) {
    if (!instanceOf(node, Node) || node.nodeType != Node.ELEMENT_NODE) return false;
    return (upperCaseOrNull(node.tagName) == 'OPTION') || (upperCaseOrNull(node.tagName) == 'INPUT' && node.type == 'option');
}

/** @return true iff node is an image element */
ElementTypes.isImage = function(node) {
    return instanceOf(node, Node)
        && node.nodeType == Node.ELEMENT_NODE 
        && (upperCaseOrNull(node.tagName) == 'IMG'
            || (upperCaseOrNull(node.tagName) == 'INPUT'
                && 'type' in node
                && node.type == 'image'));
}

/** @return true iff node is a non-whitespace text element */
ElementTypes.isText = function(node) {
    if (!instanceOf(node, Node)) return false;
    return node.nodeType == Node.TEXT_NODE && node.textContent.match(/\S/);
}

var Command = new Object();
Command.GO_COMMAND = "go";
Command.CLICK_COMMAND = "click";
Command.ENTER_COMMAND = "enter";
Command.CHECK_COMMAND = "check";
Command.CHOOSE_COMMAND = "choose";
Command.KEYPRESS_COMMAND = "keypress";
Command.REQUEST_COMMAND = "request";

function recorderFind(/*Document*/ doc, /*String*/ label, /*String*/ type, /*Element*/ context, /*Boolean*/ exact, /*Boolean*/ all) {
    if (exact == undefined) exact = false;
    if (all == undefined) all = true;
    if (!context) context = doc.getElementsByTagName("body")[0];
    
    var matches = new Array();
    var best = new Array();
    var bestStrength = 0;
 
    var iframes = context.getElementsByTagName("iframe");
    
    findInContext(context);
    
    for (var i=0; i<iframes.length; i++) {
        var c = iframes[i].contentDocument.getElementsByTagName("body")[0];
        findInContext(c);
    }

    if (all) matches.sort();
    return all ? matches : best;
    
    function findInContext(/*Element or Document*/ context) {
        var nodes = exact ? getElementsOfType(type, context, label) : getElementsOfType(type, context);
        
        //debug("find: " + label + " " + type);
        var n = nodes.iterateNext();
        while(n) {
            if (n.nodeType == Node.TEXT_NODE && n.parentNode.nodeName == "SCRIPT") {
                n = nodes.iterateNext();
                continue;
            }
            
            var box = Chickenfoot.Box.forNode(n);
            if (box.w != 0 && box.h != 0) { 
                var l = getLabelForElement(n);
        
                if (l.match(/\S/)) {
                    var strength = evaluateMatchStrength(l, label, exact);
                    //debug("try: " + strength + " " + l);
                    if (strength > 0) {
                        var m = new RMatch(n, strength, l);
                        matches.push(m);
                        
                        if (strength == bestStrength) best.push(m);
                        else if (strength > bestStrength) {
                            best = new Array();
                            best.push(m);
                            bestStrength = m.strength;
                        }
                    }
                }
            }
    
            n = nodes.iterateNext();
        }
    }
    
    function xpath(x, root) {
        return root.ownerDocument.evaluate(x, root, null, null, null);
    }
}

function getElementsOfType(/*String*/ type, /*Document or Element*/ context, /*String*/ label) {
    var doc = context.ownerDocument ? context.ownerDocument : context;
    var x;
    
    if (type == ElementTypes.TEXT_BOX) {
        x = ".//textarea | .//input[@type='text' or @type='file' or @type='password' or not(@type)]";
    }
    else if (type == ElementTypes.PASSWORD_BOX) {
        x = ".//input[@type='password']";
    }
    else if (type == ElementTypes.CHECK_BOX) {
        x = ".//input[@type='checkbox']";
    }
    else if (type == ElementTypes.RADIO_BUTTON) {
        x = ".//input[@type='radio']";
    }
    else if (type == ElementTypes.LIST_ITEM) {
        x = ".//option | .//input[@type='option']";
    }
    else if (type == ElementTypes.LIST_BOX) {
        x = ".//select";
    }
    else if (type == ElementTypes.BUTTON) {
        x = ".//button | .//input[@type='button' or @type='submit' or @type='reset']";
    }
    else if (type == ElementTypes.LINK) {
        x = ".//a";
    }
    else if (type == ElementTypes.IMAGE) {
        x = ".//img | .//input[@type='image']";
    }
    else if (type == ElementTypes.TEXT) {
        x = label ? ".//text()[.='" + label + "']" : ".//text()";
    }
    else {
        if (label) x = ".//text()[.='" + label + "'] | .//*[@alt='" + label + "' or @title='" + label + "']";
        else x = ".//text() | .//*[@alt or @title]";
    }

    return doc.evaluate(x, context, null, null, null);
}

function compareStringsByEditDistance(/*String*/ s1, /*String*/ s2) {
	var len1 = s1.length;
	var len2 = s2.length;
	var m = new Array(len1+1);
	
	for (var i=0; i<=len1; i++) {
	    m[i] = new Array(len2+1);
	    m[i][0] = i;
	}
	
	for (var j=1; j<=len2; j++) {
	    m[0][j] = j;
    }
	
	for (var i=1; i<=len1; i++) {
		for (var j=1; j<=len2; j++) {
			var num1 = m[i-1][j-1] + (s1.charAt(i-1) == s2.charAt(j-1) ? 0 : 1);
			var num2 = m[i-1][j] + 1;
			var num3 = m[i][j-1] + 1;
			
			m[i][j] = Math.min(num1, num2, num3);
		}
	}

	return 1.0 - ((m[len1][len2]) / Math.max(len1, len2));
}

function compareStringsByLCS(/*String*/ s1, /*String*/ s2) {
    var len1 = s1.length;
    var len2 = s2.length;
    var m = new Array(len1+1);
    var z = 0;
    var start = -1;
    var end = -1;
    
    for (var i=0; i<=len1; i++) {
	    m[i] = new Array(len2+1);
	    m[i][0] = 0;
	}
	
	for (var j=1; j<=len2; j++) {
	    m[0][j] = 0;
    }
    
    for (var i=1; i<=len1; i++) {
        for (var j=1; j<=len2; j++) {
            if (s1.charAt(i-1) == s2.charAt(j-1)) {
                m[i][j] = m[i-1][j-1] + 1;
                
                if (m[i][j] > z) {
                    z = m[i][j];
                    start = end = -1;
                }
                
                if (m[i][j] == z) {
                    start = i-z+1;
                    end = i;
                }
            }
            else m[i][j] = 0;
        }
    }

    return (end-start+1)/Math.max(len1,len2); 
}

function evaluateMatchStrength(/*String*/ testLabel, /*String*/ baseLabel, /*Boolean*/ exact) {
    var strength;
    
    if (exact) strength = baseLabel == testLabel ? 1.0 : 0;
    else strength = compareStringsByLCS(baseLabel, testLabel);
    
    return strength;
}

function RMatch(/*Element*/ e, /*Number*/ strength, /*String*/ label) {
    this.element = e;
    this.strength = strength;
    this.label = label;
}

RMatch.prototype.compare = function(/*Match*/ a, /*Match*/ b) {
    if (b.strength > a.strength) return -1;
    else if (b.strength < a.strength) return 1;
    else return 0;
}

RMatch.prototype.toString = function() {
    return "[" + this.label + ", " + this.strength + "]";
}
/**
 * Testing framework.
 *
 * Typical usage:
 *
 * var t = new Test();
 *
 * t.test(function() {
 *    // testing code with assertions: Test.assert(), Test.assertEquals(), etc.
 * });
 * // repeat t.test() with other tests
 *
 * // end testing and display summary of results
 * t.close();
 */
function Test() {
  this.tests = 0;
  this.successes = 0;
  
  // set dom.max_script_run_time to infinity, so that Mozilla doesn't
  // interrupt possibly-slow testing with "Do you want to abort this?"
  var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                .getService(Components.interfaces.nsIPrefBranch);  
  this.old_max_script_run_time = prefs.getIntPref("dom.max_script_run_time");
  prefs.setIntPref("dom.max_script_run_time", 500000);
}


/**
 * Get summary of test, in the form "y/y tests succeeded" or
 * "x/y tests succeeded, z FAILED"
 */
Test.prototype.toString = function() {
  return this.successes + "/" + this.tests + " tests succeeded"
          + (this.successes != this.tests
                  ? ", " + (this.tests - this.successes) + " FAILED"
                  : "");
}
  
/**
 * End a test run and display the number of tests that succeeded.
 */
Test.prototype.close = function() {
  debug(this);

  // restore dom.max_script_run_time to previous value
  var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                .getService(Components.interfaces.nsIPrefBranch);  
  prefs.setIntPref("dom.max_script_run_time", this.old_max_script_run_time);
  
  return this;
}

/**
 * Do a test.  Runs testFunction; if it doesn't throw any
 * exceptions, considers it successful; otherwise catches & displays
 * the exception and considers the test a failure.
 */
Test.prototype.test = function(/*optional string*/ name, /*function*/ testFunction) {
  if (!testFunction) {
    testFunction = name;
    name = undefined;
  }    
  
  debug((name ? name + " test " : "Test ")
         + (++this.tests) + " ...");
  try {
    testFunction();
  } catch (msg) {
    if (instanceOf(msg, UserStopped)) throw msg;
    debug(msg);
    return; // without incrementing successes
  }
  ++this.successes
}


/**
 * Assertions.  Does nothing when assertion is OK; throws exception
 * when assertion fails.  The optional message is included
 * when the assertion fails, explaining what failed.
 * If message argument is omitted, a generic message is displayed instead.
 */
Test.assert = function(/*boolean*/ test, /*optional string*/ message) {
  if (test) return;
  if (message) {
    throw "FAILURE: " + message;
  } else {
    throw "TEST FAILED!";
  }
}

Test.assertTrue = function(/*boolean*/ test, /*optional string*/ message) {
  Test.assert(test, message);
}

Test.assertFalse = function(/*boolean*/ test, /*optional string*/ message) {
  Test.assert (!test, message);
}

Test.assertEquals = function(/*any*/ arg1, /*any*/ arg2, /*optional string*/ message) {
  if (message === undefined) {
    message = arg1 + " should be equal to " + arg2;
  }
  Test.assertTrue(arg1 == arg2, message);
}

Test.fail = function(/*optional string*/ message) {
  Test.assertTrue(false, message);
}

/*
 * Trigger represents a triggerable script.
 */
function Trigger(name, source, description, enabled, includes, excludes, path, when) {
	/*String*/  this.name = name;
	/*String*/  this.description = description;
	/*boolean*/ this.enabled = enabled;
	/*String[]*/this.includes = (includes) ? includes : [ "*" ];
	/*String[]*/this.excludes = (excludes) ? excludes : [];
	/*nsIFile or chromeURL*/ this.path = path ? path : TriggerManager._saveNewTriggerScript(name, source);
	/*TriggerPoint*/  this.when = when;
}

// TriggerPoint: values for trigger.when
const FIREFOX_STARTS = "Firefox Starts";
const NEW_WINDOW = "New Window";
const PAGES_MATCH = "Pages Match";


Trigger.prototype.getSource = function() {
  if (isExportedXpi) {
    return SimpleIO.read(this.path);
  }
  else {
    return SimpleIO.read(this.path);
  }
}

Trigger.prototype.setSource = function(/* String */ source) {
	SimpleIO.write(this.path, source);
	uploadSyncTrigger(this.path);
}

/**
 * If any element of includes is not a valid trigger pattern,
 * then an exception will be thrown and includes will not be updated
 */
Trigger.prototype.includes setter = function(/*String[]*/ includes) {
  if (!includes) throw Error("includes passed to setIncludes was null");
  var newRegExps = [];
  for (var i = 0; i < includes.length; i++) {
    newRegExps[i] = Trigger.convert2RegExp(includes[i]);
  }
  this._includes = includes;
  this.includesRegExps = newRegExps;
}

Trigger.prototype.includes getter = function() { return this._includes; }

/**
 * If any element of excludes is not a valid trigger pattern,
 * then an exception will be thrown and excludes will not be updated
 */
Trigger.prototype.excludes setter = function(/*String[]*/ excludes) {
  if (!excludes) throw Error("excludes passed to setExcludes was null");
  var newRegExps = [];
  for (var i = 0; i < excludes.length; i++) {
    newRegExps[i] = Trigger.convert2RegExp(excludes[i]);
  }
  this._excludes = excludes;
  this.excludesRegExps = newRegExps;
}

Trigger.prototype.excludes getter = function() { return this._excludes; }

Trigger.convert2RegExp = function(pattern) {
  pattern = pattern.toString(); // make sure pattern is a String

  // if pattern starts with /, then assume it is already a valid RegExp
  if (pattern.length && pattern.charAt(0) == '/') {
    var match = pattern.match(/\/(.*)\/([img]*)$/);
    if (!match) throw new Error(pattern + " did not evaluate to a RegExp!");
    return new RegExp(match[1], match[2]);
  }
  
  var re = "/^";
  for (var i = 0; i < pattern.length; i++) {
    switch (pattern[i]) {
      case ' ' :
        break;
      case '*' :
        re += ".*"; break;
      case '\\' :
        re += "\\\\"; break;
      case '/' :
			case '.' : 
			case '?' :
			case '^' : 
			case '$' : 
			case '+' :
			case '{' :
			case '[' : 
			case '|' :
			case '(' : 
			case ')' :
			case ']' :
			  re += "\\" + pattern[i]; break;
			default  :
			  re += pattern[i]; break;
    }
  }
  re += "$/i";
  return eval(re);
}



function TriggerManager() {

  this.triggers = [];
  var triggerFile = this._getTriggerFile();

  // initialized by loadTriggers
  this.doc = null;

  var prefs = getPrefBranch();
  try {
    prefs.getBoolPref("ignoreAllTriggers");
  } catch (e) {
    this._ignoreAllTriggers = false;
    prefs.setBoolPref("ignoreAllTriggers", this._ignoreAllTriggers);
  }
  var mgr = this;
  addPreferenceListener(prefs, "ignoreAllTriggers", function() {
    mgr._ignoreAllTriggers = prefs.getBoolPref("ignoreAllTriggers");
    mgr.fireEvent({type:"ignoreAllTriggers"});
  });

  this._listeners = [];
  
  this.loadTriggers(triggerFile);
  
  // params for syncing with GDocs
  try {
    this.syncEnabled = getPrefBranch().getBoolPref("syncEnabled");
  } catch (e) {
    this.syncEnabled = false;
    getPrefBranch().setBoolPref("syncEnabled", this.syncEnabled);
  }
  try {
    this.googleAuthKey = getPrefBranch().getCharPref("googleAuthKey");
  } catch (e) {
    this.googleAuthKey = "";
    getPrefBranch().setCharPref("googleAuthKey", this.googleAuthKey);
  }
}

TriggerManager.prototype.getTriggerFromFile = function(file) {
  for (var i = 0; i < this.triggers.length; i++) {
    var trigger = this.triggers[i];
    if (trigger.path.equals(file)) {
      return trigger;
    }
  }
  return null;
}

TriggerManager.prototype.addListener = function(func) {
  this._listeners.push(func);
}

TriggerManager.prototype.removeListener = function(func) {
  for (var i = 0; i < this._listeners.length; i++) {
    var thisFunc = this._listeners[i];
    if (thisFunc === func) {
      this._listeners.splice(i, 1);
      return;
    }
  }
}

TriggerManager.prototype.fireEvent = function(event) {
  for (var i = 0; i < this._listeners.length; i++) {
    this._listeners[i](event);
  }
}

TriggerManager.prototype.isIgnoringTriggers = function() {
  return this._ignoreAllTriggers;
}

TriggerManager.prototype.setIgnoringTriggers = function(ignoring) {
  if (this._ignoreAllTriggers == ignoring) return;
  this._ignoreAllTriggers = ignoring;
  getPrefBranch().setBoolPref("ignoreAllTriggers", ignoring);
  this.fireEvent({type:"ignoreAllTriggers"});
}

TriggerManager.prototype.loadTriggers = function(/*nsIFile* or *chromeURL*/ file) {
  var domParser = Components.classes["@mozilla.org/xmlextras/domparser;1"].
                  getService(Components.interfaces.nsIDOMParser);
  if(file instanceof Components.interfaces.nsILocalFile) {
    var triggerXml = file;
    var _fiStream = Components.classes["@mozilla.org/network/file-input-stream;1"].
                               createInstance(Components.interfaces.nsIFileInputStream);
    var _siStream = Components.classes["@mozilla.org/scriptableinputstream;1"].
                               createInstance(Components.interfaces.nsIScriptableInputStream);
    _fiStream.init(triggerXml, 1, 0, false);
    _siStream.init(_fiStream);
    var contents = "";
    while (_siStream.available() > 0) {
      contents += _siStream.read(_siStream.available());
    }
    _siStream.close();
    _fiStream.close();
  
    // nsIDOMParser.parseFromStream has problems, so we dump file contents to string instead    
    this.doc = domParser.parseFromString(contents, "text/xml");
    var isOldFormat = this._createTriggersFromXml(this.doc);
    
    // if trigger XML was out of date, save it in the new format.
    if (isOldFormat) {
      this.saveTriggers(file);
    }
  }
  else if(file.substring(0,9) == 'chrome://') {
    var contents = Chickenfoot.SimpleIO.read(file); 
    
    // nsIDOMParser.parseFromStream has problems, so we dump file contents to string instead    
    this.doc = domParser.parseFromString(contents, "text/xml");
    this._createTriggersFromXml(this.doc);
  
  }
}

/**
 * File to save to is optional; triggers.xml in Chickenfoot profile is the default.
 */
TriggerManager.prototype.saveTriggers = function(/*nsIFile*/ opt_file) {
  if (!opt_file) opt_file = this._getTriggerFile();
  this._updateXmlDoc(this.doc);
  var buffer = [];
  this._prettyPrint(this.doc, "", buffer);
  var content = buffer.join("");
  SimpleIO.write(opt_file, content, false);
  uploadSyncTrigger(opt_file);

  this.fireEvent({type:"saveTriggers"});
}

TriggerManager.prototype.addTrigger = function(/*String*/ fileName){
    var file = Chickenfoot.SimpleIO.toFileInChickenfootDirectory(fileName).clone();
    var fileString = Chickenfoot.SimpleIO.read(file);
    var attMap = Chickenfoot.extractUserScriptAttributes(fileString);
    var map = {    name : attMap.name,
                   when : attMap.when,
                   description : attMap.description,
                   include : attMap.include,
                   exclude : attMap.exclude,
                   code : fileString
              }
    this.makeTriggerFromMap(map);
}

TriggerManager.prototype.makeTriggerFromMap = function(foundMap) {
  //default trigger properties
  var name = "no name";
  var when = "Pages Match";
  var description = "no description";
  var includes = new Chickenfoot.SlickSet();
  var excludes = new Chickenfoot.SlickSet();
  
  if (foundMap.name) {name = foundMap.name[0];}
  if (foundMap.when) {when = foundMap.when[0];}
  if (foundMap.description) {description = foundMap.description[0];}
  if (foundMap.include) {includes.addAll(foundMap.include);}
  if (foundMap.exclude) {excludes.addAll(foundMap.exclude);}

  var map = { name : name,
              when : when,
              description : description,
              includes : includes,
              excludes : excludes
            };
  var newCode = Chickenfoot.updateAttributes(foundMap.code, map);

  var trigger = new Chickenfoot.Trigger(
    name,
    newCode,
    description,
    true, //enabled boolean
    foundMap.include, // includes Array
    foundMap.exclude, // excludes Array
    undefined,  // path
    when);    // when to enable the trigger

  //check if the trigger already exists, and delete the old one if it does
  this.deleteDuplicate(name);
  //add to triggers xml file and chickenfoot profile directory
  this.triggers.push(trigger);
  this.saveTriggers();
}

TriggerManager.prototype.deleteDuplicate = function(/*string*/ name){
    for(var i=0; i<this.triggers.length; i++){
        if(this.triggers[i].name == name){
            this.triggers.splice(i,1);
        }
    }
    return;
}

/**
 * Pretty-prints an XML document. Apparently, Firefox's built-in
 * XML serializer does not support a pretty-print mode.
 * This is similar to flatten() in domFlattener.js, but adds newlines
 * and indents to make the resulting content more readable.
 * Also handles Node.DOCUMENT_NODE.
 */
TriggerManager.prototype._prettyPrint = function(node, indent, buffer) {
  // using node.ELEMENT_NODE rather than the more customary Node.ELEMENT_NODE
  // because this code may be called before Chickenfoot.Node is actually defined.
  if (node.nodeType == node.ELEMENT_NODE) {
    buffer.push(indent, "<", node.nodeName, "");
    for (var i = 0; i < node.attributes.length; ++i) {
      var attr = node.attributes[i];
      // TODO: escape attribute values
      buffer.push(" ", attr.nodeName, "=\"", removeXmlChars(attr.nodeValue), "\"");
    }
    if (node.childNodes.length == 0) {
      buffer.push("/>\n");
    } else {
      buffer.push(">\n");
      for (var i = 0; i < node.childNodes.length; ++i) {
        this._prettyPrint(node.childNodes.item(i), indent + "  ", buffer);
      }    
      buffer.push(indent, "</", node.nodeName, ">\n");
    }
  } else if (node.nodeType == node.TEXT_NODE) {
    buffer.push(removeXmlChars(node.nodeValue));
  } else if (node.nodeType == node.DOCUMENT_NODE) {
    for (var i = 0; i < node.childNodes.length; ++i) {
      this._prettyPrint(node.childNodes.item(i), indent, buffer);
    }
  }
}

TriggerManager.prototype._updateXmlDoc = function(/*XMLDocument*/ doc) {
  var ele = doc.documentElement;

  // remove old child nodes
  for (var i = ele.childNodes.length - 1; i >= 0; --i) {
    ele.removeChild(ele.childNodes.item(i));
  }
  // add new child nodes
  for (var i = 0; i < this.triggers.length; ++i) {
    var t = this.triggers[i];
    this._appendTriggerXmlNode(doc, ele, t);
  }
  // remove extra whitespace nodes
  doc.normalize();
}

TriggerManager.prototype._appendTriggerXmlNode =
    function(/*XMLDocument*/ doc, /*Element*/ ele, /*Trigger*/ t) {

  var trigger = doc.createElement('trigger');
  trigger.setAttribute('name', t.name);
  trigger.setAttribute('description', t.description);
  if (t.path.parent.equals(this._getChickenfootProfileDirectory())) {
    // in chickenfoot profile directory, just save name
    trigger.setAttribute('path', t.path.leafName);
  } else {
    // elsewhere on disk, use absolute path
    trigger.setAttribute('path', t.path.path); // questionable!    
  }
  trigger.setAttribute('enabled', t.enabled.toString());
  
  if (t.when == null){
    // Set the default value for backward compatible
    trigger.setAttribute('when', 'Pages Match');
  }else{
    trigger.setAttribute('when', t.when);
  }

  if (t.when == 'Pages Match'){
    // Add include tags and set 'urlPattern' attribute
    for (var i = 0; i < t.includes.length; ++i) {
      var includeUrlPattern = t.includes[i];
      var include = doc.createElement('include');
      include.setAttribute('urlPattern', includeUrlPattern);
      trigger.appendChild(include);
    }
  
    // Add exclude tags and set 'urlPattern' attribute
    for (var i = 0; i < t.excludes.length; ++i) {
      var excludeUrlPattern = t.excludes[i];
      var exclude = doc.createElement('exclude');
      exclude.setAttribute('urlPattern', excludeUrlPattern);
      trigger.appendChild(exclude);
    }
  }else{
    // Do not write includes and excludes information
  }
  
  ele.appendChild(trigger);
}

/**
 * Translates the XML trigger file into a data structure of in-memory triggers.
 * Returns true if XML format is out of date and should be saved immediately in
 * the updated format.
 */
TriggerManager.prototype._createTriggersFromXml = function(/*XMLDocument*/ doc) {
  var isOldFormat = false;
  
  // backwards compatibility: ignoreAllTriggers has now been moved to a preference.
  // Copy its value to the preference, and remove it from XML file.
  var docElem = doc.documentElement;
  if (docElem.hasAttribute("ignoreAllTriggers")) {
    var ignoring = (docElem.getAttribute('ignoreAllTriggers') != 'false');
    this.setIgnoringTriggers(ignoring);
    docElem.removeAttribute('ignoreAllTriggers');
    isOldFormat = true;
  }

  // 5 is XPathResult.ORDERED_NODE_ITERATOR_TYPE, but XPathResult is not in scope
  var triggerIter = doc.evaluate('triggers/trigger', doc, null, 5, null);
  var triggerNode;
  while (triggerNode = triggerIter.iterateNext()) {
    // function Trigger(name, source, description, enabled, includes)
    var name = triggerNode.getAttribute('name');
    var description = triggerNode.getAttribute('description');
    var enabled = (triggerNode.getAttribute('enabled') == 'true');

    // TODO(mbolin): handle case when path is not local to chickenfoot profile
    var file;
    var path = triggerNode.getAttribute('path');
    if (isExportedXpi) {
      file = TriggerManager._getProfileDirectory();
      file.append("extensions");
      file.append("{chickenfoot}");
      file.append(path);
    }
    else if (path.indexOf(':') >= 0) {
      file = this.getFile(path);
    } else {
      file = this._getChickenfootProfileDirectory();
      file.append(path);    
    }

    // extract "when to trigger" information
    var when = triggerNode.getAttribute('when');
    
    if (when == null){
      // give the default value to trigger's "when" attribute for backward compatible
      when = 'Pages Match';
    }
    
    if (when == 'Pages Match'){
      // extract includes
      var includes = [];
      // 5 is XPathResult.ORDERED_NODE_ITERATOR_TYPE
      var includeIter = doc.evaluate('include', triggerNode, null, 5, null);
      var includeNode;
      while (includeNode = includeIter.iterateNext()) {
        includes.push(includeNode.getAttribute('urlPattern'));
      }
      if (includes.length == 0) includes = null;

      // extract excludes
      var excludes = [];
      // 5 is XPathResult.ORDERED_NODE_ITERATOR_TYPE
      var excludeIter = doc.evaluate('exclude', triggerNode, null, 5, null);
      var excludeNode;
      while (excludeNode = excludeIter.iterateNext()) {
        excludes.push(excludeNode.getAttribute('urlPattern'));
      }
      if (excludes.length == 0) excludes = null;    
    }else{  // when == 'Firefox Starts' or 'New Winodw'
      
      var includes = [];
      var excludes = [];
      
      includes = excludes = '';
    }
    
    var t = new Trigger(name, null, description, enabled, includes, excludes, file, when);
    this.triggers.push(t);
  }

  return isOldFormat;
}

/** @return nsIFile or chromeURL */
TriggerManager.prototype._getTriggerFile = function() {
  var dir;
  if (isExportedXpi) {
    dir = TriggerManager._getProfileDirectory();
    var file = dir.clone();
    file.append("extensions");
    file.append("{chickenfoot}");
    file.append("triggers.xml");
    if (!SimpleIO.exists(file)) {
      this._initializeTriggerFolder(dir, file);
    } else if (!file.isFile()) {
      throw new Error("triggers.xml is not a file!");
    }
  }
  else {
    dir = this._getChickenfootProfileDirectory();
    var file = dir.clone();
    file.append("triggers.xml");
    if (!SimpleIO.exists(file)) {
      this._initializeTriggerFolder(dir, file);
    } else if (!file.isFile()) {
      throw new Error("triggers.xml is not a file!");
    }
  }
  return file;
}

/**
 * Copy the files in the xpi directory to the
 * chickenfoot/ directory under the user's profile.
 */
TriggerManager.prototype._initializeTriggerFolder = function(/*nsIFile*/ folder, /*nsIFile*/ file) {
  var GUID = "{896b34a4-c83f-4ea7-8ef0-51ed7220ac94}";
  var setupDir = TriggerManager._getProfileDirectory();
  setupDir.append("extensions");
  setupDir.append(GUID);
  if (setupDir.isFile()) {
    // if profile/extensions/GUID is a file, then Chickenfoot was installed
    // using run-no-install.  Need to read the contents of that file to find
    // the actual extensions directory.
    var fileContents = SimpleIO.read(setupDir);
    setupDir = SimpleIO.toFile(fileContents);
  }
  setupDir.append("setup");
  var enumeration = setupDir.directoryEntries;
  var profileDir = this._getChickenfootProfileDirectory();
  while (enumeration.hasMoreElements()) {
    var file = enumeration.getNext();
    file.QueryInterface(Components.interfaces.nsIFile);
    file.copyTo(profileDir, file.leafName);
  }
  // TODO(mbolin): update the rootDirectory attribute in triggers.xml when copied over
}

/** @return isILocalFile representing chickenfoot profile directory */
TriggerManager._getChickenfootProfileDirectory = 
TriggerManager.prototype._getChickenfootProfileDirectory = function() {
  var profileDir = TriggerManager._getProfileDirectory();
  profileDir.append("chickenfoot");
  if (!SimpleIO.exists(profileDir)) {
    try {
      profileDir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0755);
    } catch (e) {
      // TODO: figure out what to do if this happens
      throw e;
    }
  } else if (!profileDir.isDirectory()) {
    throw new Error("chickenfoot/ is not a directory!");
  }
  return profileDir;
}

/** @return nsILocalFile representing user's profile directory */
TriggerManager._getProfileDirectory = function() {
  var file = Components.classes["@mozilla.org/file/directory_service;1"]
                       .getService(Components.interfaces.nsIProperties)
                       .get("ProfD", Components.interfaces.nsILocalFile);
  return file;
}

TriggerManager._saveNewTriggerScript = function(/*String*/ name, /*String*/ script) {
  function nameToFilename(name) {
    var filename;
    filename = escape(name);
    filename = filename.replace(/\//g, "%2F");
    return filename;
  }
  
  var path = null;
  var i = 1;
  var suffix = ".js";
  while (true) {
    var path = TriggerManager._getChickenfootProfileDirectory();
    
    path.append(nameToFilename(name) + suffix);
    if (!SimpleIO.exists(path)) {
      break;
    }
    suffix = i + ".js";
    ++i;
  }

  Chickenfoot.SimpleIO.write(path, script)
  uploadSyncTrigger(path);
  
  return path;  
}

TriggerManager.prototype.getTriggersFor = function(url) {
  if (this.isIgnoringTriggers()) return []; // do not match when triggers ignored
  if (!url) throw new Error('cannot get triggers for null url');
  url = url.toString();

  //The return type of this function
  function ReturnType(scriptContent, file) {
    this.scriptContent = scriptContent; /*string*/
    this.file = file; /*nsIFile*/
  }
  
  var matchedTriggers = [];
  for (var i = 0; i < this.triggers.length; i++) {
    CONSIDER_NEXT_TRIGGER:
    
    // Only triggers with when="Pages Match" and enabled need to be checked
    if (this.triggers[i].enabled && (this.triggers[i].when == 'Pages Match')) {     
      var trigger = this.triggers[i];
      for (var j = 0; j < trigger.includesRegExps.length; j++) {
        if (url.match(trigger.includesRegExps[j])) {
          for (var k = 0; k < trigger.excludesRegExps.length; k++) {
            if (url.match(trigger.excludesRegExps[k])) {
              // this trigger should be excluded
              break CONSIDER_NEXT_TRIGGER;
            }
          }
          var temp = new ReturnType(trigger.getSource(), trigger.path);
          matchedTriggers.push(temp);
          // this trigger is decidedly included
          break CONSIDER_NEXT_TRIGGER;
        }
      }
    }
  }
  return matchedTriggers;
}

/** @return nsIFile */
TriggerManager.prototype.getFile = function(/*String*/ path) {
  var ioService = Components.classes["@mozilla.org/network/io-service;1"]
    .getService(Components.interfaces.nsIIOService);
  var scriptableStream = Components
    .classes["@mozilla.org/scriptableinputstream;1"]
    .getService(Components.interfaces.nsIScriptableInputStream);  
  var channel = ioService.newChannel(path, null, null);
  channel.QueryInterface(Components.interfaces.nsIFileChannel);
  return channel.file;
}

/** @exported */
TriggerManager.prototype.QueryInterface = function (iid) {
  if (!iid.equals(Components.interfaces.cfITriggerManager)
       && !iid.equals(Components.interfaces.nsISupports))
    throw Components.results.NS_ERROR_NO_INTERFACE;
  return this;
}

/**
 * Set an account that the TriggerManager will use for syncing triggers with GDocs.
 * Note: the authentication key will be saved to Preferences
 *
 * @throw exception if failed to log in
 */
TriggerManager.prototype.setGoogleSync = function(enabled, email, password) {
  if (!enabled) {
    this.setSyncEnabled(false)
  } else {
    this.setSyncEnabled(true);
    try {
      this.setGoogleAuthKey(getGDocsAuth(email, password));
    } catch(e) {
      this.setGoogleAuthKey("");
      throw(e);
    }
  }
}

/**
 * Setter for syncEnabled
 */
TriggerManager.prototype.setSyncEnabled = function(enabled) {
  this.syncEnabled = enabled;
  getPrefBranch().setBoolPref("syncEnabled", this.syncEnabled);
}

/**
 * Setter for googleAuthKey
 */
TriggerManager.prototype.setGoogleAuthKey= function(auth) {
  this.googleAuthKey = auth;
  getPrefBranch().setCharPref("googleAuthKey", this.googleAuthKey);
}

/**
 * Upload all triggers to Google Docs 
 */
TriggerManager.prototype.uploadAllTriggers = function() {
  if (!this.syncEnabled) return;
  
  var auth = this.googleAuthKey;
  var folder = getGDocsChickenfootFolderID(auth);
  
  var triggers_xml = Chickenfoot.SimpleIO.read(this._getTriggerFile());
  
  var triggers_xml_edit = getGDocsChickenfootScriptEditLink(auth, folder, "triggers.xml");
  updateGDocsDocument(auth, triggers_xml_edit, 'triggers.xml', triggers_xml);
  
  for (var i=0; i<this.triggers.length; i++) {
    var content = Chickenfoot.SimpleIO.read(this.triggers[i].path.path);
    var filename = this.triggers[i].path.leafName;
    var edit_link = getGDocsChickenfootScriptEditLink(auth, folder, filename);
    updateGDocsDocument(auth, edit_link, filename, content);
  }
  
}

TriggerManager.prototype.uploadTrigger = function(/*nsIFile*/ file) {
  if (!this.syncEnabled) return;

  var auth = this.googleAuthKey;
  var folder = getGDocsChickenfootFolderID(auth);
  
  // TODO: somewhat hacky way for initializing
  if (!containsGDocsChickenfootScript(auth, folder, "triggers.xml")) {
    // upload all triggers if the folder doesn't have triggers.xml -- first time syncing
    this.uploadAllTriggers();
    return;
  }
  
  var content = Chickenfoot.SimpleIO.read(file);
  var filename = file.leafName;
  var edit_link = getGDocsChickenfootScriptEditLink(auth, folder, filename);
  
  updateGDocsDocument(auth, edit_link, filename, content);
}

/**
 * Download all triggers from Google Docs 
 */
TriggerManager.prototype.downloadAllTriggers = function() {
  if (!this.syncEnabled) return;
  var auth = this.googleAuthKey;
  var folder = getGDocsChickenfootFolderID(auth);
  var triggers_path = this._getTriggerFile();
  triggers_path = triggers_path.parent;
  var names = getGDocsAllChickenfootFileNames(auth, folder);
  for (var i=0; i<names.length; i++) {
    var content = readGDocsDocument(auth, folder, names[i]);
    content = escapeGDocs(content);
    var file_path = triggers_path.clone();
    file_path.append(names[i]);
    debugToErrorConsole('writing ' + names[i]);
    Chickenfoot.SimpleIO.write(file_path, content);
    debugToErrorConsole("downloaded " + names[i]);
  }
  this.triggers = [];
  this.loadTriggers(this._getTriggerFile());
  debugToErrorConsole('downloadAllTriggers done');
}

/**
 * Populate a context menu that lets a user run a trigger on a page
 */
function populateTriggerContextMenuPopup(popup) {
  var doc = popup.ownerDocument;
  // delete existing child nodes
  while (popup.hasChildNodes()) {
    popup.removeChild(popup.lastChild);
  }
  // add a menuitem for each available trigger
  var triggers = gTriggerManager.triggers;
  for (var i = 0; i < triggers.length; ++i) {
    var trigger = triggers[i];
    var menuitem = doc.createElement("menuitem");
    menuitem.setAttribute("label", trigger.name);
    menuitem.setAttribute("oncommand", "Chickenfoot.runTriggerNow(" + i + ", window)");
    popup.appendChild(menuitem);
  }
}

/**
 * Callback for triggers listed in context menu
 */
function runTriggerNow(index, chromeWindow) {
  var tabbrowser = chromeWindow.gBrowser;
  var browser = tabbrowser.getBrowserForTab(tabbrowser.selectedTab);
  var win = browser.contentWindow.wrappedJSObject;
  evaluate(chromeWindow,
           gTriggerManager.triggers[index].getSource(),
           false,
           win,
           {scriptDir: gTriggerManager.triggers[index].path.parent});
}
  
/**
 * Extract "Firefox Starts" and "New Window" triggers' source scripts
 */
function/*String[]*/ getTriggersForEvent(/* "Pages Match" | "Firefox Starts" | "New Window" */ when){
  
  function ReturnType(scriptContent, file) {
    this.scriptContent = scriptContent; /*string*/
    this.file = file; /*nsIFile*/
  }
  
  var matchedTriggers = [];
  var triggers = gTriggerManager.triggers;
  
  for (var i = 0; i < triggers.length; i++) {
    var trigger = triggers[i];
    if (trigger.enabled && (trigger.when == when)) {     
      var temp = new ReturnType(trigger.getSource(), trigger.path);
      matchedTriggers.push(temp);      
    }
  }
  return matchedTriggers;
}

var isFirstTimeLaunched = true;
var isNewWindow = false;

function addTriggerListener(/*ChromeWindow*/ chromeWindow) {
  var browser = getTabBrowser(chromeWindow);  
  browser.addEventListener("load", triggerListener, true);

  var isFirefoxStart = isFirstTimeLaunched;
  isFirstTimeLaunched = false;
  isNewWindow = true;
  
  function triggerListener(event) {
    // deal with command-line script(s)
    if (chickenfootCommandLineHandler && chickenfootCommandLineHandler.runThese) {
      for (var i = 0; i < chickenfootCommandLineHandler.runThese.length; i++) {
        evaluateFile(chromeWindow, chickenfootCommandLineHandler.runThese[i].file,
            chickenfootCommandLineHandler.runThese[i].context)
      }
      chickenfootCommandLineHandler.runThese = null
    }
      
    var doc = event.originalTarget;
    try {
      doc.QueryInterface(Components.interfaces.nsIDOMHTMLDocument);
    } catch (e) {
      try {
          doc.QueryInterface(Components.interfaces.nsIDOMXULDocument);
          //is XUL document
      }
      catch (err) {
        return;
      }
    }
    
    var triggers = gTriggerManager.getTriggersFor(doc.location.toString()); 
    if (triggers.length){
      var win = doc.defaultView;
      for (var i = 0; i < triggers.length; ++i) {
        evaluate(chromeWindow, triggers[i].scriptContent, false, win, {scriptDir: triggers[i].file.parent});
      }
    }

    if (isFirefoxStart){
      var specificTriggers = getTriggersForEvent("Firefox Starts");
      for (var i = 0; i < specificTriggers.length; ++i) {
        evaluate(chromeWindow, specificTriggers[i].scriptContent, false, doc.defaultView, {scriptDir: specificTriggers[i].file.parent});
      }
      isFirefoxStart = false;
    }
 
    if (isNewWindow){
      var specificTriggers = getTriggersForEvent("New Window");
      for (var i = 0; i < specificTriggers.length; ++i) {
        evaluate(chromeWindow, specificTriggers[i].scriptContent, false, doc.defaultView, {scriptDir: specificTriggers[i].file.parent});
      }
      isNewWindow = false;
    }
     
  }
  
}

/**
 * Upload a file (trigger or triggers.xml) to Google Docs
 */
function uploadSyncTrigger(/*nsIFile*/ file) {
  try {
    if (Chickenfoot.gTriggerManager.syncEnabled) { 
      Chickenfoot.gTriggerManager.uploadTrigger(file);
    }
  } catch(e) {
    getAnyChromeWindow().alert(e.message);  
    Chickenfoot.gTriggerManager.setSyncEnabled(false);
    Chickenfoot.gTriggerManager.setGoogleAuthKey("");
  }
}

/**
 * This function adds install-trigger buttons to pages on the Chickenfoot scripts wiki. The
 * buttons are added to the bottom of the divs that contain scripts. This function should only
 * be called when at the Chickenfoot scripts wiki, i.e. when pages match :
 *    http://groups.csail.mit.edu/uid/chickenfoot/scripts/index.php/*
 * NOTE: This function was written to be a built-in trigger, see where it is registered as a load
 *       listener in Chickenfoot.js
 *
 * @param document : Document //this is the HTML document node of the Chickenfoot scripts wiki page
 */
function installTriggerButtons(/*Document*/document) {
//search the DOM for divs that contain scripts
var pred = function (node) {
  var results = [];
  for (var h=0; h<node.childNodes.length; h++) {
    if (upperCaseOrNull(node.childNodes[h].tagName) == "PRE") {results.push(node.childNodes[h]);}
  }
  return ((upperCaseOrNull(node.tagName) == "DIV") && (node.childNodes.length > 0) && (results.length > 0));
}
var treewalker = Chickenfoot.createDeepTreeWalker(document.wrappedJSObject, NodeFilter.SHOW_ALL, pred);
var current = treewalker.nextNode();

//iterate through all the scripts divs found and put a button at the bottom of each one
while(current) {
  if (current.wrappedJSObject) {current = current.wrappedJSObject;}

  //search for user script attributes
  var preElements = filterElements(current.childNodes, "PRE");
  for (var t=0; t<preElements.length; t++) {
    var codeBody = preElements[t].textContent;
    var attMap = Chickenfoot.extractUserScriptAttributes(codeBody);
    var count=0;
    for (prop in attMap) {count++;}
    if (count > 0) {
      var map = { name : attMap.name,
                  when : attMap.when,
                  description : attMap.description,
                  include : attMap.include,
                  exclude : attMap.exclude,
                  code : codeBody
                }
                
      //create the button html element, then attach it to the script div
      var button = document.wrappedJSObject.createElement('button');
      var buttonText = document.wrappedJSObject.createTextNode('Install Script as Trigger');
      button.appendChild(buttonText);
      button.map = map;
      button.id = "chickenfootInstallScriptButton" + t;
      button.onclick = function(event) {makeTrigger(document.wrappedJSObject.getElementById(this.id).map);};
      preElements[t].appendChild(button);
    }
  }
  current = treewalker.nextNode();
}

/**
 * This function filters a list of DOM elements for the ones that have the specified tag name
 *
 * @param elements : Array DOM elements //this is the list of DOM nodes to filter
 * @param tag : String //this is the tagname to check the nodes against
 *
 * @return an array of the filtered elements
 */
function filterElements(/*Array DOM elements*/elements,/*String*/tag) {
  var results = [];  var m=0;
  tag = tag.toUpperCase();
  for (var k=0; k<elements.length; k++) {
    if (upperCaseOrNull(elements[k].tagName) == tag) {results[m] = elements[k]; m++;}
  }
  return results;
}

/**
 * This function creates a new trigger given a map of its properties.
 * The new created trigger is NOT RETURNED at the end of the function, this function returns nothing.
 *
 * @param foundMap : Object //this is the object whose properties store the new trigger's information
 */
function makeTrigger(/*Object*/foundMap) {
  //default trigger properties
  var name = "no name";
  var when = "Pages Match";
  var description = "no description";
  var includes = new Chickenfoot.SlickSet();
  var excludes = new Chickenfoot.SlickSet();
  
  //if given values for trigger properties, use these instead of default trigger properties
  if (foundMap.name) {name = foundMap.name[0];}
  if (foundMap.when) {when = foundMap.when[0];}
  if (foundMap.description) {description = foundMap.description[0];}
  if (foundMap.include) {includes.addAll(foundMap.include);}
  if (foundMap.exclude) {excludes.addAll(foundMap.exclude);}

  //put the trigger's information into the actual script file as metadata
  var map = { name : name,
              when : when,
              description : description,
              includes : includes,
              excludes : excludes
            };
  var newCode = Chickenfoot.updateAttributes(foundMap.code, map);

  //create the new trigger object
  var trigger = new Chickenfoot.Trigger(
    name,
    newCode,
    description,
    true, //enabled boolean
    foundMap.include, // includes Array
    foundMap.exclude, // excludes Array
    undefined,  // path
    when);    // when to enable the trigger

  //add to triggers xml file and chickenfoot profile directory
  Chickenfoot.gTriggerManager.triggers.push(trigger);
  Chickenfoot.gTriggerManager.saveTriggers();
}
debug('');

}
/**
 * @fileoverview Functions for syncing via Google Docs.
 */


/**
 * Gets a GData Google Docs auth token to use with the Google Account that
 * corresponds to the specified email address. Uses Google's ClientLogin to
 * obtain the token:
 * http://code.google.com/apis/accounts/docs/AuthForInstalledApps.html
 * @param {string} email Email address of the account to get an auth token for.
 * @param {string} password Password for the account.
 * @return {string?} The auth token
 */
function getGDocsAuth(email, password) {
  var authToken = null;
  var googUrl = "https://www.google.com/accounts/ClientLogin";
  var request = new XMLHttpRequest();
  var asynchronous = false;
  request.open("POST", googUrl, asynchronous);

  var params = "accountType=GOOGLE&Email=" + encodeURIComponent(email) +
      "&Passwd=" + encodeURIComponent(password) + "&service=writely";
  request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  request.setRequestHeader("GData-Version", "2.0");
  request.setRequestHeader("Connection", "close");
  request.send(params);

  if (request.status == 200) {
    var data = request.responseText;
    var lines = data.split('\n');
    for (var i = 0; i < lines.length; ++i) {
      var line = lines[i];
      var match = line.match(/^Auth=([\w-]+)$/);
      if (match) {
        authToken = match[1];
        break;
      }
    }
  } else {
    throw new Error('Login error: ' + request.status + ' ' +
        request.statusText);
  }
  return authToken;
}


/**
 * Makes an authenticated GET request to GDocs.
 * @param {string} authToken Token acquired using getGDocsAuth().
 * @param {string} url GDocs URL to make the request to.
 * @return {string} The text of the response from the GDocs server.
 */
function getGDocsXMLfromURL(authToken, url) {
  var request = new XMLHttpRequest();
  var asynchronous = false;
  request.open("GET", url, asynchronous);

  request.setRequestHeader("GData-Version", "2.0");
  request.setRequestHeader("Authorization", "GoogleLogin auth=" + authToken);
  request.setRequestHeader("Connection", "close");
  request.send(null);

  if (request.status == 200) {
    return request.responseText;
  } else {
    throw new Error('Error making GET request: ' + request.status + ' ' +
        request.statusText);
  }
}


/**
 * Makes an authenticated POST request to GDocs that sends XML.
 * @param {string} authToken Token acquired using getGDocsAuth().
 * @param {string} url GDocs URL to make the request to.
 * @param {string} xml
 * @return {string}
 */
function getGDocsXMLfromURL_sendXML(authToken, url, protocol, xml) {
  var request = new XMLHttpRequest();
  var asynchronous = false;
  request.open(protocol, url, asynchronous);

  request.setRequestHeader("Content-Type", "application/atom+xml");
  request.setRequestHeader("GData-Version", "2.0");
  request.setRequestHeader("Authorization", "GoogleLogin auth=" + authToken);
  request.setRequestHeader("Content-Length", xml.length);
  request.setRequestHeader("Connection", "close");
  request.send(xml);

  if (request.status == 201) {
    var data = request.responseText;
    return data;
  } else {
    throw new Error('ERROR: ' + request.status + ' ' +
        request.statusText);
  }
}


function _constructContentBody(docTitle, docType, contentBody, contentType) {
  var atom = "<?xml version='1.0' encoding='UTF-8'?>" +
             '<entry xmlns="http://www.w3.org/2005/Atom">' +
             '<category scheme="http://schemas.google.com/g/2005#kind"' +
             ' term="http://schemas.google.com/docs/2007#' + docType + '" label="' + docType + '"/>' +
             '<title>' + docTitle + '</title>' +
             '</entry>';

  var body = '--END_OF_PART\r\n' +
             'Content-Type: application/atom+xml;\r\n\r\n' +
             atom + '\r\n' +
             '--END_OF_PART\r\n' +
             'Content-Type: ' + contentType + '\r\n\r\n' +
             contentBody + '\r\n' +
             '--END_OF_PART--\r\n';  
  return body;  
}  

// make a plain text request to GDocs
function getGDocsXMLfromURL_sendText(auth, URL, protocol, thingToSend) {
  var request = new XMLHttpRequest();
  var asynchronous = false;
  request.open(protocol, URL, asynchronous);
  
  request.setRequestHeader("GData-Version", "2.0");
  request.setRequestHeader("Authorization", "GoogleLogin auth=" +auth);
  request.setRequestHeader("If-Match", "*"); 
  request.setRequestHeader("Connection", "close");
  request.setRequestHeader("Content-Length", thingToSend.length);
  request.setRequestHeader("Content-Type", "text/plain;");
  request.send(thingToSend);

  if (request.status == 200) {
     var data = request.responseText;
     return data;
  } else {
   throw new Error('ERROR: ' + request.status + ' ' +
   request.statusText);
  }
} 

// send multipart content
function getGDocsXMLfromURL_sendMultipart(auth, URL, protocol, thingToSend) {
  var request = new XMLHttpRequest();
  var asynchronous = false;
  request.open(protocol, URL, asynchronous);
  
  request.setRequestHeader("GData-Version", "2.0");
  request.setRequestHeader("Authorization", "GoogleLogin auth=" +auth);
  request.setRequestHeader("If-Match", "*"); 
  request.setRequestHeader("Connection", "close");
  request.setRequestHeader("Content-Length", thingToSend.length);
  request.setRequestHeader("Content-Type", "multipart/related; boundary=END_OF_PART");
  request.send(thingToSend);

  if (request.status == 200) {
     var data = request.responseText;
     return data;
  } else {
   throw new Error('ERROR: ' + request.status + ' ' +
   request.statusText);
  }
}

// make chickenfoot triggers folder
function createGDocsChickenfootFolder(auth) {
  var url = "http://docs.google.com/feeds/documents/private/full";
  var entry = "";

  entry += '<atom:entry xmlns:atom="http://www.w3.org/2005/Atom">';
  entry += '<atom:category scheme="http://schemas.google.com/g/2005#kind" term="http://schemas.google.com/docs/2007#folder" label="folder"/>';
  entry += '<atom:title>Chickenfoot Triggers</atom:title>';
  entry += '</atom:entry>';
  
  var result = getGDocsXMLfromURL_sendXML(auth, url, "POST", entry);
  return result;
}

// create empty file in chickenfoot triggers folder
function createGDocsEmptyFile(auth, folderid, filename) {
  var url = "http://docs.google.com/feeds/folders/private/full/folder%3A" + folderid;
  var entry = "";

  entry += '<atom:entry xmlns:atom="http://www.w3.org/2005/Atom">';
  entry += '<atom:category scheme="http://schemas.google.com/g/2005#kind" term="http://schemas.google.com/docs/2007#document" label="document"/>';
  entry += '<atom:title>' + filename + '</atom:title>';
  entry += '</atom:entry>';
  
  var result = getGDocsXMLfromURL_sendXML(auth, url, "POST", entry);
  return result;
}

// get chickenfoot triggers folder id
function getGDocsChickenfootFolderID(auth) {
  var url = "http://docs.google.com/feeds/documents/private/full?showfolders=true";
  var result = getGDocsXMLfromURL(auth, url);
  
  var id = _findTitleInXML(result, "Chickenfoot Triggers");
  // if not found, create folder
  if (id == "") {
    result = createGDocsChickenfootFolder(auth);
    id = _findTitleInXML(result, "Chickenfoot Triggers");
  }
  
  return id;
}

// get all file names in chickenfoot folder
function getGDocsAllChickenfootFileNames(auth, folderid) {
  var url = "http://docs.google.com/feeds/folders/private/full/folder%3A" + folderid;
  var result = getGDocsXMLfromURL(auth, url);
  
  var titles = new Array();
  var j = 0;
  var parser = new DOMParser();
  var doc = parser.parseFromString(result, "text/xml");
  var entries = doc.getElementsByTagName('entry');
  for (var i=0; i<entries.length; i++) {
    var entry = entries[i];
    if (entry.getElementsByTagName('title').length > 0) {
      var title = entry.getElementsByTagName('title')[0].textContent;
      titles[j] = title;
      j++;
    }
  }
  
  return titles;
}

// check if folder contains filename
function containsGDocsChickenfootScript(auth, folderid, filename) {
  var url = "http://docs.google.com/feeds/folders/private/full/folder%3A" + folderid;
  var result = getGDocsXMLfromURL(auth, url);
  
  var id = _findTitleInXML(result, filename);
  return (id != "");
}

// get document id of a chickenfoot script (create empty if not exist)
function getGDocsChickenfootScriptID(auth, folderid, filename) {
  var url = "http://docs.google.com/feeds/folders/private/full/folder%3A" + folderid;
  var result = getGDocsXMLfromURL(auth, url);
  
  var id = _findTitleInXML(result, filename);
  // if not found, create empty file
  if (id == "") {
    result = createGDocsEmptyFile(auth, folderid, filename);
    id = _findTitleInXML(result, filename);
  }
  
  return id;
}

// get document's edit link for a chickenfoot script (create empty if not exist)
function getGDocsChickenfootScriptEditLink(auth, folderid, filename) {
  var url = "http://docs.google.com/feeds/folders/private/full/folder%3A" + folderid;
  var result = getGDocsXMLfromURL(auth, url);

  var editlink = _findEditLinkByTitleInXML(result, filename);
  // if not found, create empty file
  if (editlink == "") {
    result = createGDocsEmptyFile(auth, folderid, filename);
    editlink = _findEditLinkByTitleInXML(result, filename);
  }
  return editlink;
}

function updateGDocsDocument(auth, editlink, title, content) {
  var url = editlink;
  var result = getGDocsXMLfromURL_sendMultipart(auth, url, "PUT", _constructContentBody(title, 'document', content, 'text/plain'));
  return result;
}

function _findTitleInXML(xml, title) {
  var parser = new DOMParser();
  var doc = parser.parseFromString(xml, "text/xml");
  var entries = doc.getElementsByTagName('entry');
  for (var i=0; i<entries.length; i++) {
    var entry = entries[i];
    var titles = entry.getElementsByTagName('title');
    if (titles.length > 0) {
      if (titles[0].textContent == title) {
        var id_str = entry.getElementsByTagName('id')[0].textContent;
        return id_str.substring(id_str.lastIndexOf("%3A")+3);
      }
    }
  }
  return "";
}

function _findEditLinkByTitleInXML(xml, title) {
  var parser = new DOMParser();
  var doc = parser.parseFromString(xml, "text/xml");
  var entries = doc.getElementsByTagName('entry');
  for (var i=0; i<entries.length; i++) {
    var entry = entries[i];
    var titles = entry.getElementsByTagName('title');
    if (titles.length > 0) {
      if (titles[0].textContent == title) {
        var links = entry.getElementsByTagName('link');
        for (var j=0; j<links.length; j++) {
          if (links[j].getAttribute('rel') == 'self') {
            var href = links[j].getAttribute('href');
            return 'http://docs.google.com/feeds/media/private/full/' + href.substring(href.indexOf('document%3A'));
          }
        }
      }
    }
  }
  return "";
}

// read a file in GDocs
function readGDocsDocument(auth, folderid, filename) {
  var documentid = getGDocsChickenfootScriptID(auth, folderid, filename);
  var url = "http://docs.google.com/feeds/download/documents/Export?docID=" + documentid + "&exportFormat=txt";
  var result = getGDocsXMLfromURL(auth, url);
  
  return result;
}

// escape from GDocs txt to normal txt (replacing double < and double > with single ones)
function escapeGDocs(content) {
  var ltRegExp = new RegExp(String.fromCharCode(171), "g");
  var gtRegExp = new RegExp(String.fromCharCode(187), "g");
  content = content.replace(ltRegExp, "<");
  content = content.replace(gtRegExp, ">");
  return content;
}

/**
 * Tools for handling Greasemonkey userscripts and Chickenfoot trigger scripts
 *
 * Can identify the ==UserScript== tag and attributes within it
 * 
 */

/**
 * Take a string of Chickenscratch and extract any information
 * inside any ==UserScript== tags.
 *
 * @param code {string}
 * @param keyValueHandler {function}
 * @param lineBuffer {string[]} 
 * @return {attributeName->attributeValue[]} keys are attribute names and values
 *   are arrays of values that correspond to that attribute.
 *   Some attributes, such as @exclude, can be repeated, which is why arrays are
 *   used as values for the map.
 */
function extractUserScriptAttributes(code,
                                     /*optional*/ keyValueHandler,
                                     /*optional*/ commentClosingHandler,
                                     /*optional*/ lineBuffer) {
  // this is a fairly simple implementation; it assumes that
  // each attribute name/value pair fit on one line
  var lines = code.split('\n');
  var inComment = false;
  var map = {};
  for (var i = 0; i < lines.length; ++i) {
    var line = lines[i];
    if (!inComment) {
      if (line.match(/^\s*\/\/\s+==UserScript==\s*$/)) {
        inComment = true;
      }
      if (lineBuffer) lineBuffer.push(line);
    } else {
      if (line.match(/^\s*\/\/\s+==\/UserScript==\s*$/)) {
        inComment = false;
        if (commentClosingHandler) commentClosingHandler();
        if (lineBuffer) lineBuffer.push(line);
      } else {
        var match;
        if (match = line.match(/^\s*\/\/\s+@(\w+)\s+(.*)\s*$/)) {
          var k = match[1], v = match[2];
          var a = (k in map) ? map[k] : (map[k] = []);
          a.push(v);
          if (lineBuffer && (line = keyValueHandler(line, k, v))) {
            lineBuffer.push(line);
          }
        } else {
          if (lineBuffer) lineBuffer.push(line);
        }
      }
    }
  }  
  return map;
}

/**
 * This method takes a map of attributes and a string of code. It updates the
 * attributes in the code, and returns the new string. It does not overwrite any
 * existing attributes that are not being updated.
 * @param oldCode : string //the code to update
 * @param map : key->value attribute map //the attributes to update and their new values
 * @return a string of the updated code
 */
function updateAttributes(oldCode, map) {
  //get all the attributes in the existing code, and add all of the non-matching key->value
  // mappings to 'map' so that we don't overwrite any attributes that we don't want to update
  var existingAttMap = {};
  try { existingAttMap = extractUserScriptAttributes(oldCode); }
  catch(e) {}
  var code = removeExistingAttributes(oldCode);
  
  var lineBuffer = [];
  lineBuffer.push('// ==UserScript==');

  //put in all non-includes/excludes attributes
  for (var key in map) {
    try {
      var currentArray = map[key].toArray();
      if(currentArray.length == 0) { continue; }
      for(var i=0; i<currentArray.length; i++) {
        lineBuffer.push('// @' + key + ' ' + currentArray[i]);
      }
    }
    catch(e) { if(map[key]) { lineBuffer.push('// @' + key + ' ' + map[key]); } }
  }

  //put in all the non-updated attributes
  for(var key in existingAttMap) {
    if (!(key in map)) lineBuffer.push('// @' + key + ' ' + existingAttMap[key]);
  }
  
  lineBuffer.push('// ==/UserScript=='); 
  var newCode = lineBuffer.join('\n') + "\n\n" + code;

  return newCode;
}

function removeExistingAttributes(/*String*/code) {
  var codeStrings = [];
  
  var lines = code.split('\n');
  var inComment = false;
  for (var i=0; i<lines.length; i++) {
    var line = lines[i];
    if (!inComment && line.match(/^\s*\/\/\s+==UserScript==\s*$/)) { inComment = true; continue; }
    else if (line.match(/^\s*\/\/\s+==\/UserScript==\s*$/)) { inComment = false; continue; }
    else if (inComment && line.match(/^\s*\/\/\s+@(\w+)\s+(.*)\s*$/)) { continue; }
    else { codeStrings.push(line); }
  }
  
  var newCode = codeStrings.join('\n');
  return newCode;
}
goog.require('goog.structs.Map');

// TODO(mbolin): Replace SlickSet with goog.structs.Set.

/**
 * A Set implementation that composes a Map.
 *
 * A SlickSet can contain any value except null or undefined.
 */

/**
 * Creates a new, empty Set.
 */
function SlickSet() {
  this.map = new goog.structs.Map(); 
}

/**
 * A private dummy object that is
 * the value for a key in the goog.structs.Map.
 */
SlickSet.DUMMY = {};

/**
 * Adds the specified object to the set.
 * @return a boolean indicating if
 *   this was a new addition to the Set
 */
SlickSet.prototype.add = function(obj) {
  if (this.map.containsKey(obj)) {
    return false;
  } else {
    this.map.set(obj, SlickSet.DUMMY);
    return true;
  }
};

/**
 * Adds each element of the specified array to the set
 */
SlickSet.prototype.addAll = function(arr) {
  for (var i = 0; i < arr.length; ++i) {
    this.add(arr[i]);
  }
};

/**
 * Removes the specified object from the map.
 * @return a boolean indicating if
 *   the obj was there to be removed
 */
SlickSet.prototype.remove = function(obj) {
  return this.map.remove(obj);
};

/**
 * @return the size of the set
 */
SlickSet.prototype.size = function() {
  return this.map.getCount();
};

/**
 * @return a boolean indicating if the set is empty
 */
SlickSet.prototype.isEmpty = function() {
  return this.map.getCount() == 0;
};

/**
 * @return a boolean indicating of the obj
 *  is an element of the set
 */
SlickSet.prototype.contains = function(obj) {
  return this.map.containsKey(obj);
};

/**
 * Removes all of the entries from the set
 */
SlickSet.prototype.clear = function() {
  this.map.clear();
};

/**
 * @return the elements of the set in an array
 */
SlickSet.prototype.toArray = function() {
  return this.map.getKeys();
};

/**
 * Create a new StringBuffer,
 * optionally passing str as the initial contents of the StringBuffer
 * 
 * If str is a String, then str will be the initial contents of the buffer.
 * If str is non-null, then str.toString() will be the initial contents.
 * Otherwise, the buffer will initially be empty.
 */
function StringBuffer(str) {
  if (arguments.length && (str = StringBuffer.asString(str))) {
    this.buffer = [ str ];
  } else {
    this.buffer = [];
  }
}

/**
 * Append the string (or toString()) of the provided argument
 * to this StringBuffer
 *
 * @return this
 */
StringBuffer.prototype.append = function(str) {
  str = StringBuffer.asString(str);
  if (str) this.buffer.push(str);
  return this;
}

/**
 * Prepend the string (or toString()) of the provided argument
 * to this StringBuffer
 *
 * @return this
 */
StringBuffer.prototype.prepend = function(str) {
  str = StringBuffer.asString(str);
  if (str) this.buffer.unshift(str);
  return this;
}

/**
 * Remove all the characters from this StringBuffer
 *
 * @return this
 */
StringBuffer.prototype.clear = function() {
  this.buffer = [];
  return this;
}

/**
 * @return the contents of this StringBuffer as a string
 */
StringBuffer.prototype.toString = function() {
  var str = this.buffer.join("");
  this.buffer = [ str ];
  return str;
}

/**
 * @return the number of characters in this StringBuffer
 */
// has the side-effect of compacting this.buffer by invoking toString()
StringBuffer.prototype.__defineGetter__("length", function() {
  return this.toString().length;
});

// TODO: make this a "static" method of StringBuffer
// returns a string of at least one character, or null
StringBuffer.asString = function(obj) {
  if (typeof(obj) == 'string') {
    return obj;
  } else if (obj != null) {
    return obj.toString();
  } else {
    return null;
  }
}

/** Test Code for StringBuffer 
sb = new StringBuffer('Thomas');

debug(sb);
sb.append(' Bolin');
debug(sb);
sb.prepend('Michael ');
debug(sb);
debug(sb.length);

sb2 = new StringBuffer();
debug(sb2.length);
sb2.append('Whatever');
debug(sb2);
debug(sb2.length);

sb3 = new StringBuffer(null);
debug(sb3);
debug(sb3.length);
debug(sb3.prepend('Mr.'));
debug(sb3.append(null));
debug(sb3.append(' Rogers'));
*/


// This file provides functions for discovering the chrome window,
// sidebar window, html window, and html document.


/**
 * Get the Chickenfoot sidebar window for a Firefox chrome window.
 * (Use document property of this window to get the DOM for
 * sidebar.xul.)
 * Returns null if sidebar is hidden or some sidebar other 
 * than Chickenfoot is showing.
 */
function getSidebarWindow(/*ChromeWindow*/ chromeWindow) {
  var sbvbox = chromeWindow.document.getElementById("sidebar-box");
  if (sbvbox.hidden) {
    // no sidebar is visible
    return null;
  }
  
  var sb = chromeWindow.document.getElementById("sidebar");
  var src = sb.getAttribute("src");
  if (!src.match(/chrome:\/\/chickenfoot/)) {
    // a sidebar other than Chickenfoot is visible
    return null;
  }
  
  // if sidebar doesn't have a docShell property, then
  // it's not visible
  if (!sb.docShell) {
    return null;
  }
  
  return sb.contentWindow;
}

/**
 * Get the Firefox chrome window that contains the given 
 * Chickenfoot sidebar window.
 */
function getChromeWindow(/*SidebarWindow*/ sidebarWindow) {
  return sidebarWindow.parent;
}



/**
 * Get the tabbrowser XUL node for a Firefox chrome window.
 * Useful for attaching load and progress listeners.
 */
function getTabBrowser(/*ChromeWindow*/ chromeWindow) {
  return chromeWindow.getBrowser();
}

/**
 * Get the HTML Window of the visible tab in the given 
 * Firefox chrome window.
 * Note: don't use the document property of an HTML Window
 * directly.  Use getLoadedHtmlDocument(chromeWindow, win) instead, 
 * to ensure that it's loaded.
 */
function getVisibleHtmlWindow(/*ChromeWindow*/ chromeWindow) {
  return chromeWindow._content;
}


/**
 * Get the <tab> XUL object for an HTML Window.
 */
function getTab(/*HtmlWindow*/ htmlWindow) {
    // enumerate all the ChromeWindows
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
             .getService(Components.interfaces.nsIWindowMediator);
    var e = wm.getEnumerator("navigator:browser");
  search:
    while (e.hasMoreElements()) {
      var chromeWindow = e.getNext();
      
      // enumerate the tabs within chromeWindow
      var tabBrowser = getTabBrowser(chromeWindow);
      var tabs = tabBrowser.mTabBox._tabs.childNodes;
      for (var i = 0; i < tabs.length; ++i) {
        var tab = tabs[i];
        var browser = tabBrowser.getBrowserForTab(tab);
        if (browser.contentWindow == htmlWindow) {
          return tab;
        }
      }
    }

    return null;    
}

/**
 * Get the chrome window containing an HTML window.
 */
function getChromeWindowOfHtmlWindow(/*HTML Window*/ win) {
  return getTab(win).ownerDocument.defaultView;
}

/**
 * Get the <browser> XUL object for an HTML Window.
 * @return Browser or null if not found.
 */
function getBrowser(/*HtmlWindow*/ htmlWindow) {
  var tab = getTab(htmlWindow);
  return tab ? tab.linkedBrowser : null;
}

/**
 * Get the WebProgess object for an HTML Window.
 * @return WebProgress or null if not found.
 */
function getWebProgress(/*HtmlWindow*/ htmlWindow) {
  var browser = getBrowser(htmlWindow);
  return browser ? browser.webProgress : null;
}

/**
 * Get the HTML Document for the given HTML Window.  If the document
 * is currently loading, then this function blocks until it is loaded.
 * @returns Document
 * @throws Error if document doesn't finish loading in 30 seconds
 */
function getLoadedHtmlDocument(/*ChromeWindow*/ chromeWindow, 
                               /*HtmlWindow*/ win) {
  var webProgress;
  try {
    webProgress = getWebProgress(win);
  } catch (e) {
    // TODO: getWebProgress throws an exception on Fennec.
    // Make it work correctly; in the meantime, just find the frontmost
    // tab's webProgress as shown here:
    webProgress = chromeWindow.getBrowser().webProgress;
  }
  
  // TODO: I (mbolin) believe that getWebProgress does not work when win
  // represents the contentWindow of an IFRAME
  // because getWebProgress(win) calls getBrowser(win) which returns null
  // For now:
  if (!webProgress) return win.document;
  
  const delay = 100;
  const maxDelay = 30000;
  const iterations = maxDelay/delay;
  var warningInterval = 5/delay;
  for (var i = 0; i < iterations; ++i) {
    checkForStop();
    if (!webProgress.isLoadingDocument) {
      recordCreatedRanges(win.document);
      return win.document;
    }
    sleepImpl(chromeWindow, delay);
  }
  throw new Error("never finished loading " + win.document.title);
}

/**
 * Tests whether the document in an HTML window is loaded.
 * @return true if loaded, false if currently loading.
 */
function isWindowLoaded(/*HtmlWindow*/ win) {
  return !getWebProgress(win).isLoadingDocument;
}


/**
    Finds a chrome window owned by Firefox and returns it.
    Returns null if there are no such windows.
    
    @return             Returns a chrome window.
*/
function /*ChromeWindow*/ getAnyChromeWindow() {
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
    var e = wm.getEnumerator(null);
    while (e.hasMoreElements()) {
        var w = e.getNext();
        return w;
    }
    return null;
}


function /*String*/ upperCaseOrNull(/*String*/ s) {
  if (s == null) return s;
  else return s.toUpperCase();
}

// Test whether an object is an instance of a class.
// We use this function in preference to the builtin Javascript
// instanceof operator for two reasons:
// 
// 1. The builtin Javascript classes are different in different
// Javascript namespaces.  So if you create a String s in one
// XPCOM namespace (say, Chickenfoot), and try to test it with 
// "s instanceof String" in another XPCOM namespace, it will return false.  
// This function gets around
// that by comparing class *names* instead of class *objects*, so
// instanceOf(obj, String) will return true for *any* obj created from
// a constructor named "String".  This is a stronger condition than 
// the true Javascript instanceof, but it suffices for our purposes.
//
// 2. There was a bug in instanceof in Firefox 1.0.3: The code
//   <obj> instanceof <type> 
// throws an exception whenever <obj> comes from the browser content 
// (like the document or a node) and <type> is not actually its type.
// The exeption thrown is "Illegal operation on WrappedNative prototype 
// object"  nsresult: "0x8057000c (NS_ERROR_XPC_BAD_OP_ON_WN_PROTO)".
// This instanceOf() function does not throw an exception, but instead
// quietly returns false.
//

function instanceOf(value, type) {
//  return value instanceof type;

  try {
    // first try built-in test -- if it succeeds, we're golden.
    if (value instanceof type) return true;
  } catch (exception) {
    if (exception instanceof TypeError) {
      throw exception; // indicates that "type" is not a type
    }
    // Otherwise, assume the exception was caused by 
    // the Firefox 1.0.3 bug.  Work around it.
    if (type === Object)
      return true;
    else
      return false;
  }

  // instanceof operator returned false.

  // Make sure value is an object, because instanceof
  // should be false if it's not.
  var valueType = typeof value;
  if (value == null
      || (valueType != "object" && valueType != "function")) {
    return false;
  }

  // Try comparing class names.
  try {
    var typeName = type.name;
    var valueClassName = value.constructor.name;

    if (typeName == "Object") {
      // already checked that value is an object, so
      // this must be true
      return true; 
    }

    if (!valueClassName || !typeName) return false;
    
    return valueClassName == typeName;

  } catch (exception) {
    return false;
  }
}



function sleepImpl(/*ChromeWindow*/ chromeWindow, /*int*/ milliseconds) {
    const cls = Components.classes["@mozilla.org/thread-manager;1"];
    if (!cls) return null;
    var threadmgr = cls.getService(Components.interfaces.nsIThreadManager);
    var thread = threadmgr.currentThread;
    var done = false;
    chromeWindow.setTimeout(function() { done = true; }, milliseconds);
    while (!done) thread.processNextEvent(true);
    checkForStop();
}

/* This file contains a collection of string utility functions.
 */

function condenseSpaces (/*string*/ str, /*optional DeleteMap*/ map) {
  var totalDeletions = 0;
  if (str == null) return "";
  return str.replace(/\s+/gm, getReplacement);

  function getReplacement(/*String*/ spacesMatched,
                    /*int*/ offset,
                    /*String*/ originalString) {
    var replacement; // replacement for match
    var pos = offset; // position of deleted whitespace in original raw string
    var len = spacesMatched.length;  // length of deleted whitespace

    if (pos == 0) {
      // whitespace at start of string is removed entirely
      replacement = '';

      // map cooked offset 0 to after the deleted whitespace
      if (map) map.add(0, len);
    } else if (pos + len == originalString.length) {
      // whitespace at end of string is also removed, but
      // cooked position should map to just after last nonwhite char,
      // so don't add to map
      replacement = '';
    } else {
      // internal whitespace is replaced by a single space
      replacement = ' ';
      --len;

      // map cooked offset just after space to the length of the deleted whitespace
      if (map && len > 0) map.add((pos-totalDeletions)+1, len);
    }

    totalDeletions += len;

    return replacement;
  }
}

/**
 * DeleteMap keeps track of the deletions made by a function like condenseSpaces(),
 * so that offsets in the function's output string (the "cooked string") can
 * be mapped back to offsets in the function's longer input string (the "raw string").
 */
function DeleteMap() {
  this.map = [];
}

/**
 * Record a deletion in the map.  Used by condenseSpaces().
 */
DeleteMap.prototype.add = function(/*int*/ cooked, /*int*/ len) {
  this.map.push(cooked);
  this.map.push(len);
}

/**
 * Convert a cooked offset into a raw offset.  Used by clients of condenseSpaces().
 * @param offset in cooked text, 0 <= cooked <= cookedString.length
 * @returns corresponding offset in raw text, 0<=raw<=rawString.length
 */
DeleteMap.prototype.cookedToRaw = function(/*int*/ cooked) {
  var totalDeletions = 0;
  for (var i = 0; i < this.map.length; i += 2) {
    var posI = this.map[i];
    var lenI = this.map[i+1];
    if (posI <= cooked) {
      totalDeletions += lenI;
    } else {
      break;
    }
  }
  return cooked + totalDeletions;
}





/** place a backslash before every " in the string */
function backquote(/*string*/ str) {
  if (!str) return "";
  return str.replace(/\"/mg, '\\"');
}

function makeFirstLetterLowercase(/*string*/ s) {
  if (s.length == 0) {
    return s
  } else {
    return s.substring(0, 1).toLowerCase() + s.substring(1)
  }
}

