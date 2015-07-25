/**
 * @file Super skinny model class.
 * @author David Rekow <d@davidrekow.com>
 */

/**
 * @private
 * @param {function()} fn
 * @return {boolean}
 */
var isMethod = function (fn) {
  return (typeof fn === 'function' &&
    fn !== Boolean &&
    fn !== Number &&
    fn !== String &&
    fn !== Object &&
    fn !== Array &&
    fn !== Date &&
    !Model.isSubclass(fn));
};

/**
 * @class
 * @param {Object.<string, ?>=} props
 */
var Model = function (props) {
  /**
   * @private
   * @type {Object.<string, ?>}
   */
  this._prop = {};

  /**
   * @private
   * @type {?(number|string)}
   */
  this._mid = null;

  if (props) {
    for (var key in props) {
      if (props.hasOwnProperty(key)) {
        this[key] = props[key];
      }
    }
  }
};

/**
 * @static
 * @param {string} name
 * @param {Adapter=} adapter
 * @return {?Adapter}
 */
Model.adapters = require('./adapter');

/**
 * @static
 * @param {string} kind
 * @param {Object.<string, function(new:?)>} properties
 * @param {function(new:Model)=} parent
 * @return {function(new:Model)}
 */
Model.create = function (kind, properties, parent) {
  parent = parent && Model.isSubclass(parent) ? parent : Model;

  var ctor = function () {
    parent.apply(this, arguments);
  };

  ctor.prototype = Object.create(parent.prototype);
  ctor.prototype.constructor = ctor;
  ctor.prototype.kind = kind;
  ctor.prototype.props = {};

  ctor.defineProperty = Model.defineProperty;
  ctor.useAdapter = Model.useAdapter;

  for (var key in properties) {
    if (properties.hasOwnProperty(key)) {
      ctor.defineProperty(key, properties[key]);
    }
  }

  return ctor;
};

/**
 * @static
 * @param {string} name
 * @param {function(new:?)} type
 * @this {function(new:Model)}
 */
Model.defineProperty = function (name, type) {
  if (isMethod(type)) {
    return this.prototype[name] = type;
  }

  Object.defineProperty(this.prototype, name, {
    enumerable: true,
    get: function () {
      return this._prop[name];
    },
    set: function (val) {
      if (val !== null && val.constructor !== this.props[name]) {
        console.warn('[model-thin]: Tried to set invalid property type for %s, ignoring.', name);
      } else {
        this._prop[name] = val;
      };
    }
  });

  this.prototype.props[name] = type;
};

/**
 * @static
 * @param {function(new:?)} cls
 * @return {boolean}
 */
Model.isSubclass = function (cls) {
  if (typeof cls === 'function') {
    while (cls !== Object) {
      cls = Object.getPrototypeOf(cls.prototype).constructor;
      if (cls === Model) {
        return true;
      }
    }
  }

  return false;
};

/**
 * @static
 * @param {(string|Adapter)} adapter
 * @this {function(new:Model)}
 * @TODO fallbacks
 */
Model.useAdapter = function (adapter) {
  if (typeof adapter === 'string') {
    adapter = Model.adapters(adapter);
  }

  if (adapter) {
    this.prototype.adapter = adapter;
  } else {
    console.warn('[model-thin] Error using adapter: adapter not found or provided.');
  }
};

/**
 * @param {(number|string)=} newId
 * @return {?(number|string)}
 */
Model.prototype.id = function (newId) {
  if (newId) {
    this._mid = newId;
  }

  return this._mid;
};

Model.prototype.del = function () {
  if (this.adapter) {
    this.adapter.remove(this);
  } else {
    console.warn('[model-thin] No storage specified for kind ' + this.kind + '.')
  }
};

/**
 * @param {function(?Error, ?Model)} cb
 */
Model.prototype.get = function (cb) {
  if (this.adapter) {
    this.adapter.retrieve(this, cb);
  } else {
    cb(new Error('No storage specified for kind ' + this.kind + '.'));
  }
};

Model.prototype.put = function () {
  if (this.adapter && this.validate()) {
    this.adapter.persist(this);
  } else {
    console.warn('[model-thin] No storage specified for kind ' + this.kind + '.')
  }
};

/**
 * @return {boolean}
 * @TODO model-level validations (required, indexed etc).
 */
Model.prototype.validate = function () {
  return true;
};

Model.useAdapter(require('./adapters/memory')); // Use in-memory adapter by default.

module.exports = Model;
