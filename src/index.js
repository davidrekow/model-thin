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

  /**
   * @private
   * @type {boolean}
   */
  this._changed = false;

  if (props) {
    this.set(props);
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
  ctor.find = Model.find;
  ctor.kind = kind;

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
  var spec;

  if (isMethod(type)) {
    return this.prototype[name] = type;
  }

  spec = {};

  if (typeof type === "object") {
    spec.required = !!type.required;
    spec.indexed = !!type.indexed;
    spec.type = type.type;
  } else {
    spec.required = false;
    spec.indexed = false;
    spec.type = type;
  }

  Object.defineProperty(this.prototype, name, {
    enumerable: true,
    get: function () {
      return this._prop[name];
    },
    set: function (val) {
      if (val !== null && val.constructor !== this.props[name].type) {
        console.warn('[model-thin]: Tried to set invalid property type for %s, ignoring.', name);
      } else {
        this._prop[name] = val;
        this._changed = true;
      };
    }
  });

  this.prototype.props[name] = spec;
};

/**
 * @static
 * @param {(Object|function(Array.<Model>))} queryOpts
 * @param {function(Array.<Model>)=} cb
 * @this {function(new:Model)}
 */
Model.find = function (queryOpts, cb) {
  var cls = this;

  if (typeof queryOpts === 'function') {
    cb = queryOpts;
    queryOpts = {};
  }

  queryOpts.kind = this.kind;

  if (this.prototype.adapter && this.prototype.adapter.configured) {
    this.prototype.adapter.query(queryOpts, function (err, entities, cursor) {
      if (err) {
        return cb(err);
      }

      if (!queryOpts.select) {
        entities = entities.map(function (entity) {
          return cls.prototype.adapter.toModel(entity, cls);
        });
      }

      cb(null, entities, cursor);
    });
  } else {
    console.warn('[model-thin] Storage adapter not ready for ' + this.kind + '.')
  }
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
 * @static
 * @param {Model} model
 * @return {boolean}
 */
Model.validate = function (model) {
  var spec;

  for (var prop in model.constructor.props) {
    spec = model.constructor.props[prop];

    if (spec.required === true && model[prop] == null) {
      return false;
    }
  }

  return true;
}

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

/**
 * @param {function(Error=)} cb
 */
Model.prototype.del = function (cb) {
  if (this.adapter && this.adapter.configured) {
    this.adapter.remove(this, cb);
  } else {
    console.warn('[model-thin] Storage adapter not ready for ' + this.kind + '.')
  }
};

/**
 * @param {function(?Error, ?Model)} cb
 */
Model.prototype.get = function (cb) {
  if (this.adapter && this.adapter.configured) {
    this.adapter.retrieve(this, cb);
  } else {
    cb(new Error('Storage adapter not ready for ' + this.kind + '.'));
  }
};

/**
 * @param {function(Error=)} cb
 */
Model.prototype.put = function (cb) {
  if (this.adapter && this.adapter.configured && this.validate()) {
    this.adapter.persist(this, cb);
  } else {
    console.warn('[model-thin] Storage adapter not ready for ' + this.kind + '.')
  }
};

/**
 * @param {(Object.<string, ?>|string)} prop
 * @param {?=} value
 * @return {Model}
 */
Model.prototype.set = function (prop, value) {
  if (value === undefined) {
    for (var key in prop) {
      if (prop.hasOwnProperty(key)) {
        this.set(key, prop[key]);
      }
    }
  } else {
    this[prop] = value;
  }

  return this;
};

/**
 * @return {boolean}
 */
Model.prototype.validate = function () {
  return Model.validate(this);
};

/**
 * Expose the in-memory adapter.
 */
Model.adapters('memory', require('./adapters/memory'));

/**
 * Select the in-memory adapter by default for all Model types.
 */
Model.useAdapter('memory');

module.exports = Model;
