const appRoot = require('app-root-path');
const composeErrors = require('compose-middleware').errors;
const _ = require('lodash');

const { errorBuilder, errorHandler } = appRoot.require('errors/errors');

/**
 * @summary Determines if an error is an openapi error
 */
const isOpenAPIError = err => (
  _.has(err, 'errors') && _.every(err.errors, it => _.includes(it.errorCode, 'openapi'))
);

/**
 * @summary The middleware for handling custom openapi errors
 */
const customOpenAPIError = (err, req, res, next) => {
  // call the next middleware function if the error is not an openapi error
  if (!isOpenAPIError(err)) {
    next(err);
  }

  const { status, errors } = err;
  const handledErrors = [];

  if (status === 400) {
    const details = [];
    _.forEach(errors, (error) => {
      const { path, errorCode } = error;
      if (path === 'term' && errorCode === 'pattern.openapi.validation') {
        const { term } = req.query;
        details.push(`Term code: '${term}' is not valid`);
        handledErrors.push(error);
      }
    });
    err.errors = _.difference(err.errors, handledErrors);
    err.details = details;
  }
  next(err);
};

/**
 * @summary The middleware for handling general openapi errors
 */
const openAPIError = (err, req, res, next) => {
  // call the next middleware function if the error is not an openapi error
  if (!isOpenAPIError(err)) {
    next(err);
  }

  const { status, errors } = err;

  if (status === 400) {
    const details = err.details || [];
    _.forEach(errors, (error) => {
      const {
        path,
        errorCode,
        message,
        location,
      } = error;

      if (errorCode === 'enum.openapi.validation') {
        details.push(`${path} must be one of ['${error.params.allowedValues.join("', '")}']`);
      } else if (errorCode === 'additionalProperties.openapi.validation') {
        const { additionalProperty } = error.params;
        details.push(`Unrecognized property '${additionalProperty}' in path: '${path}', location: '${location}'`);
      } else {
        details.push(`Error in path: '${path}', location: '${location}', message: '${message}'`);
      }
    });
    errorBuilder(res, 400, details);
  } else {
    errorHandler(res, err);
  }
};

/**
 * @summary The middleware for handling generic errors
 */
const genericError = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  const status = _.has(err, 'customStatus') ? err.customStatus : 500;
  let detail = _.has(err, 'customMessage') ? err.customMessage : null;
  detail = status === 400 ? [detail] : detail;

  if (status === 500) {
    if (detail) {
      console.error(detail);
    }
    errorHandler(res, err);
  } else {
    errorBuilder(res, status, detail);
  }
};

const runtimeErrors = composeErrors([
  customOpenAPIError,
  openAPIError,
  genericError,
]);

module.exports = { runtimeErrors };
