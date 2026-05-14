const { CalendarEvent } = require("../../models");
exports.getCalendarEvents = async (req, res) => {
  const filter = {school:req.school._id};
  if (req.query.month) { filter.bsDate = {$regex:`^2082-${req.query.month.padStart(2,"0")}`}; }
  res.json(await CalendarEvent.find(filter).sort("bsDate"));
};
exports.createCalendarEvent = async (req, res) => {
  const e = new CalendarEvent({...req.body,school:req.school._id,createdBy:req.user._id});
  await e.save(); res.status(201).json(e);
};
exports.updateCalendarEvent = async (req, res) => {
  const e = await CalendarEvent.findOneAndUpdate(
    {_id:req.params.id,school:req.school._id},
    {...req.body,updatedBy:req.user._id},
    {new:true}
  );
  res.json(e);
};
exports.deleteCalendarEvent = async (req, res) => {
  await CalendarEvent.findOneAndDelete({_id:req.params.id,school:req.school._id});
  res.json({message:"Deleted"});
};
