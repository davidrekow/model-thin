/**
 * @file Simple abstraction for querying via adapter.
 * @author David Rekow <d@davidrekow.com>
 */

/**
 * Interface for flexible query options.
 *
 * @interface {Object} Query
 */

/**
 * Limit the result set.
 *
 * @name Query#limit
 * @type {number=}
 */

/**
 * Return the result set starting after a certain number of results.
 *
 * @name Query#offset
 * @type {number=}
 */

/**
 * Sort the result set into a certain order.
 *
 * @name Query#sort
 * @type {string=}
 */

/**
 * Return only certain properties from found results.
 *
 * @name Query#select
 * @type {(string|Array.<string>)=}
 */

/**
 * Group aggregate results by property.
 *
 * @name Query#group
 * @type {(string|Array.<string>)=}
 */

/**
 * Specify cursor tokens for start and/or end of the result set.
 *
 * @name Query#cursor
 * @type {Object.<{start: (string|number)=, end: (string|number)=}>=}
 */

/**
 * Provide a map or list of filters to apply to the query.
 *
 * @name Query#filter
 * @type {(Object|Array.<Object>)=}
 */

/**
 * The model class name this query was called on (automatically populated).
 *
 * @name Query#kind
 * @type {string}
 */
