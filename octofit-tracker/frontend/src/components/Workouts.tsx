import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Workout = { _id?: string; title: string; reason?: string; focus?: string; minutes?: number; difficulty?: string };

export default function Workouts() {
  const [suggestions, setSuggestions] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    getJson<{ suggestions: Workout[] }>('/api/workouts/suggestions/mona%40example.com')
      .then(({ suggestions: results }) => {
        if (active) setSuggestions(results);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">Workout suggestions</h2>
        <p>Recommend workouts from activity patterns.</p>
        {loading && <p role="status">Loading workout suggestions...</p>}
        {error && <p role="alert">Unable to load workout suggestions.</p>}
        {!loading && !error && suggestions.length === 0 && <p>No workout suggestions yet.</p>}
        {!loading && !error && suggestions.length > 0 && (
          <ul className="list-group">
            {suggestions.map((workout, index) => (
              <li className="list-group-item" key={workout._id ?? `${workout.title}-${index}`}>
                <h3 className="h6">{workout.title}</h3>
                {workout.focus && <p className="mb-1">Focus: {workout.focus}</p>}
                {workout.minutes !== undefined && <p className="mb-1">Duration: {workout.minutes} minutes</p>}
                {workout.difficulty && <p className="mb-1">Difficulty: {workout.difficulty}</p>}
                {workout.reason && <p className="mb-0">{workout.reason}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
