module.exports = function handler(req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({
    ok: true,
    githubTokenConfigured: Boolean(process.env.GITHUB_TOKEN),
    printQueueSecretConfigured: Boolean(process.env.PRINT_QUEUE_SECRET),
    queueIssue: Number(process.env.PRINT_QUEUE_ISSUE || 1)
  }));
};
