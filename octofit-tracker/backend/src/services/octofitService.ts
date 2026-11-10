import mongoose from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw Object.assign(new Error('Activity input must be an object'), { status: 400 });
  }

  const { userId, teamId, type, minutes, occurredAt } = input as Record<string, unknown>;
  if (
    typeof userId !== 'string' ||
    !mongoose.isValidObjectId(userId) ||
    typeof teamId !== 'string' ||
    !mongoose.isValidObjectId(teamId)
  ) {
    throw Object.assign(new Error('Valid userId and teamId are required'), { status: 400 });
  }
  if (typeof type !== 'string' || !type.trim() || typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 1) {
    throw Object.assign(new Error('A non-empty type and minutes of at least 1 are required'), { status: 400 });
  }

  if (occurredAt !== undefined && typeof occurredAt !== 'string' && typeof occurredAt !== 'number') {
    throw Object.assign(new Error('occurredAt must be a valid date'), { status: 400 });
  }
  const activityDate = occurredAt === undefined ? new Date() : new Date(occurredAt);
  if (Number.isNaN(activityDate.getTime())) {
    throw Object.assign(new Error('occurredAt must be a valid date'), { status: 400 });
  }

  const [user, team] = await Promise.all([
    User.exists({ _id: userId }),
    Team.exists({ _id: teamId }),
  ]);
  if (!user || !team) {
    throw Object.assign(new Error('The specified user or team does not exist'), { status: 404 });
  }

  return Activity.create({
    user: userId,
    team: teamId,
    type,
    minutes,
    points: minutes,
    occurredAt: activityDate,
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw Object.assign(new Error('Team input must be an object'), { status: 400 });
  }

  const { name, mascot, members = [] } = input as Record<string, unknown>;
  if (typeof name !== 'string' || !name.trim() || typeof mascot !== 'string' || !mascot.trim()) {
    throw Object.assign(new Error('A non-empty name and mascot are required'), { status: 400 });
  }
  if (!Array.isArray(members) || members.some((member) => typeof member !== 'string' || !mongoose.isValidObjectId(member))) {
    throw Object.assign(new Error('members must be an array of valid user IDs'), { status: 400 });
  }

  return Team.create({ name, mascot, members });
}

export async function getLeaderboard() {
  const totals = await Activity.aggregate<{ teamName: string; totalPoints: number }>([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    {
      $lookup: {
        from: Team.collection.name,
        localField: '_id',
        foreignField: '_id',
        as: 'team',
      },
    },
    { $unwind: '$team' },
    { $sort: { totalPoints: -1, 'team.name': 1 } },
    { $project: { _id: 0, teamName: '$team.name', totalPoints: 1 } },
  ]);
  return totals.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).lean();
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  const activity = await Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).lean();
  const activityType = activity?.type.toLowerCase() ?? '';
  const focus = /strength|weight|resistance/.test(activityType)
    ? 'strength'
    : /run|cycle|cardio|endurance/.test(activityType)
      ? 'endurance'
      : user.fitnessGoal.toLowerCase();
  const reason = activity
    ? `Recommended based on your ${activity.type} activity and ${user.fitnessGoal} fitness goal.`
    : `Recommended based on your ${user.fitnessGoal} fitness goal.`;
  const workouts = await Workout.find().lean();

  return workouts
    .map((workout, index) => ({ ...workout, reason, index }))
    .sort((a, b) => Number(b.focus.toLowerCase() === focus) - Number(a.focus.toLowerCase() === focus) || a.index - b.index)
    .map(({ index: _index, ...workout }) => workout);
}

export { User };
