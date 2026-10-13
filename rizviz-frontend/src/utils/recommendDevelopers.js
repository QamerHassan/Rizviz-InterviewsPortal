import dayjs from 'dayjs';
import { getInterviewRowStatus } from './interviewStatusUtils';

export const normalizeKey = (value) => String(value || '').trim().toLowerCase();

export const getInterviewCompany = (row) =>
  row?.CompanyName ?? row?.companyName ?? row?.company_name ?? '';

export const getInterviewDeveloper = (row) =>
  row?.IntervieweeName ?? row?.intervieweeName ?? row?.interviewee_name ?? '';

export const getInterviewDate = (row) =>
  row?.InterviewDate ?? row?.interviewDate ?? row?.interview_date ?? null;

const parseDate = (value) => {
  if (!value) return null;
  const d = dayjs(value);
  return d.isValid() ? d : null;
};

export const isUpcomingInterview = (row, today = dayjs().startOf('day')) => {
  const status = (getInterviewRowStatus(row) || '').toLowerCase().trim();
  if (['cancelled', 'x', 'deleted', 'dropped', 'dead'].includes(status)) {
    return false;
  }
  const d = parseDate(getInterviewDate(row));
  if (!d) return false;
  return !d.isBefore(today, 'day');
};

export const interviewsForCompany = (interviews, companyName) => {
  const key = normalizeKey(companyName);
  if (!key) return [];
  return (interviews || []).filter((row) => normalizeKey(getInterviewCompany(row)) === key);
};

const uniqueStacks = (values) => {
  const seen = new Set();
  const out = [];
  (values || []).forEach((s) => {
    const t = String(s || '').trim();
    if (!t) return;
    const k = t.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(t);
  });
  return out;
};

/**
 * Build recommended developers from previous interviews with the selected company.
 * Sort: most recent company interview, then interview count, then stack match.
 */
export const recommendDevelopers = ({ interviews = [], candidates = [], companyName }) => {
  const companyRows = interviewsForCompany(interviews, companyName);
  const byDev = new Map();

  companyRows.forEach((row) => {
    const name = String(getInterviewDeveloper(row) || '').trim();
    if (!name) return;
    const key = normalizeKey(name);
    const date = parseDate(getInterviewDate(row));
    const status = getInterviewRowStatus(row);
    const stack = row.Stack ?? row.stack;
    const interviewFor = (row.InterviewFor ?? row.interviewFor ?? '').trim();
    const existing = byDev.get(key);
    if (!existing) {
      byDev.set(key, {
        name,
        key,
        count: 1,
        lastDate: date,
        lastStatus: status,
        lastInterviewFor: interviewFor,
        stacks: uniqueStacks([stack]),
        history: [{ date, status, id: row.Id ?? row.id, interviewFor, devName: name, companyName: getInterviewCompany(row) }],
      });
      return;
    }
    existing.count += 1;
    existing.history.push({ date, status, id: row.Id ?? row.id, interviewFor, devName: name, companyName: getInterviewCompany(row) });
    existing.stacks = uniqueStacks([...existing.stacks, stack]);
    if (date && (!existing.lastDate || date.isAfter(existing.lastDate))) {
      existing.lastDate = date;
      existing.lastStatus = status;
      existing.lastInterviewFor = interviewFor;
    }
  });

  const candidateByKey = new Map(
    (candidates || []).map((c) => [normalizeKey(c.interviewee_name || c.IntervieweeName || c.name), c])
  );

  return Array.from(byDev.values())
    .map((dev) => {
      const profile = candidateByKey.get(dev.key);
      const stacks = uniqueStacks([...(dev.stacks || []), ...(profile?.stacks || [])]);
      return {
        ...dev,
        email: profile?.email || '',
        stacks,
        experience: profile?.experience || profile?.interview_count || null,
        interviewCountTotal: profile?.interview_count ?? dev.count,
        lastInterviewFor: dev.lastInterviewFor || '',
        history: (dev.history || [])
          .filter((h) => h.date)
          .sort((a, b) => b.date.valueOf() - a.date.valueOf()),
      };
    })
    .sort((a, b) => {
      const aTime = a.lastDate ? a.lastDate.valueOf() : 0;
      const bTime = b.lastDate ? b.lastDate.valueOf() : 0;
      if (bTime !== aTime) return bTime - aTime;
      if (b.count !== a.count) return b.count - a.count;
      return String(a.stacks[0] || '').localeCompare(String(b.stacks[0] || ''));
    });
};

export const companySummaryFromInterviews = (interviews, companyName) => {
  const rows = interviewsForCompany(interviews, companyName);
  let lastDate = null;
  const stacks = [];
  rows.forEach((row) => {
    const d = parseDate(getInterviewDate(row));
    if (d && (!lastDate || d.isAfter(lastDate))) lastDate = d;
    const stack = row.Stack ?? row.stack;
    if (stack) stacks.push(stack);
  });
  const primaryStack = uniqueStacks(stacks)[0] || null;
  return {
    name: companyName,
    interviewCount: rows.length,
    lastInterviewDate: lastDate,
    primaryStack,
  };
};

export const upcomingForDeveloperAtCompany = (interviews, developerName, companyName, today = dayjs().startOf('day')) => {
  const devKey = normalizeKey(developerName);
  const companyKey = normalizeKey(companyName);
  return (interviews || []).some((row) => {
    if (normalizeKey(getInterviewDeveloper(row)) !== devKey) return false;
    if (companyKey && normalizeKey(getInterviewCompany(row)) !== companyKey) return false;
    return isUpcomingInterview(row, today);
  });
};

export const getUpcomingInterviewForDeveloper = (interviews, developerName, companyName = null, today = dayjs().startOf('day')) => {
  const devKey = normalizeKey(developerName);
  const companyKey = companyName ? normalizeKey(companyName) : null;
  return (interviews || []).find((row) => {
    if (normalizeKey(getInterviewDeveloper(row)) !== devKey) return false;
    if (companyKey && normalizeKey(getInterviewCompany(row)) !== companyKey) return false;
    return isUpcomingInterview(row, today);
  }) || null;
};

export const getUpcomingAssignmentsForCompany = (interviews, companyName, today = dayjs().startOf('day')) => {
  const companyKey = normalizeKey(companyName);
  if (!companyKey) return [];
  return (interviews || []).filter((row) => {
    if (normalizeKey(getInterviewCompany(row)) !== companyKey) return false;
    return isUpcomingInterview(row, today);
  });
};

export const hasUpcomingAnywhere = (interviews, developerName, today = dayjs().startOf('day')) => {
  const devKey = normalizeKey(developerName);
  return (interviews || []).some(
    (row) => normalizeKey(getInterviewDeveloper(row)) === devKey && isUpcomingInterview(row, today)
  );
};

