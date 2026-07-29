const getPaginationOptions = (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);

  let limit = parseInt(query.limit, 10) || 20;
  limit = Math.min(Math.max(limit, 1), 100);

  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip
  };
};

const buildPagination = ({ total, page, limit }) => {
  const totalPages = Math.ceil(total / limit) || 1;

  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
};

module.exports = {
  getPaginationOptions,
  buildPagination
};