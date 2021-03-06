const appRoot = require('app-root-path');

const studentsDAO = require('../../../db/oracledb/students-dao');

const { errorBuilder, errorHandler } = appRoot.require('errors/errors');
const { openapi: { paths } } = appRoot.require('utils/load-openapi');

const get = async (req, res) => {
  try {
    const { osuId } = req.params;
    const { term } = req.query;
    const result = await studentsDAO.getAcademicStatusById(osuId, term);
    if (result === undefined) {
      errorBuilder(res, 404, 'A student with the OSU ID was not found.');
    } else {
      res.send(result);
    }
  } catch (err) {
    errorHandler(res, err);
  }
};

get.apiDoc = paths['/students/{osuId}/academic-status'].get;

module.exports = { get };
