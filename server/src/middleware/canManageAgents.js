function getAllowList() {
  return (process.env.ALLOWED_UPLOADERS || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function canManageAgents(req, res, next) {
  const requesterEmail = (req.header("x-user-email") || "").trim().toLowerCase();
  const allowList = getAllowList();

  if (!requesterEmail || !allowList.includes(requesterEmail)) {
    return res.status(403).json({
      message:
        "You are not authorized to manage agents. Provide an allowed x-user-email header.",
    });
  }

  req.requesterEmail = requesterEmail;
  next();
}
