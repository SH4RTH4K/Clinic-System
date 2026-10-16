/**
 * Helpers for bi-directional synchronization between Age (Years, Months, Days) and Date of Birth (DOB).
 */

function parseAsOfDate(asOfDate) {
    if (!asOfDate) return new Date();
    if (asOfDate instanceof Date && !isNaN(asOfDate.getTime())) return asOfDate;
    if (typeof asOfDate === 'string') {
        const clean = asOfDate.split('T')[0];
        const p = clean.split('-');
        if (p.length === 3) {
            const yr = parseInt(p[0], 10);
            const mo = parseInt(p[1], 10) - 1;
            const da = parseInt(p[2], 10);
            if (!isNaN(yr) && !isNaN(mo) && !isNaN(da)) {
                return new Date(yr, mo, da);
            }
        }
    }
    return new Date();
}

export function calculateAgeFromDob(dobString, asOfDate = new Date()) {
    if (!dobString || typeof dobString !== 'string') {
        return { years: '', months: '', days: '' };
    }
    const cleanDob = dobString.split('T')[0];
    const parts = cleanDob.split('-');
    if (parts.length !== 3) {
        return { years: '', months: '', days: '' };
    }

    const birthYear = parseInt(parts[0], 10);
    const birthMonth = parseInt(parts[1], 10) - 1; // 0-indexed (0 - 11)
    const birthDay = parseInt(parts[2], 10);

    if (isNaN(birthYear) || isNaN(birthMonth) || isNaN(birthDay)) {
        return { years: '', months: '', days: '' };
    }

    const targetDate = parseAsOfDate(asOfDate);
    let years = targetDate.getFullYear() - birthYear;
    let months = targetDate.getMonth() - birthMonth;
    let days = targetDate.getDate() - birthDay;

    if (days < 0) {
        // Borrow days from previous month of targetDate
        const prevMonthLastDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), 0).getDate();
        days += prevMonthLastDay;
        months -= 1;
    }

    if (months < 0) {
        months += 12;
        years -= 1;
    }

    if (years < 0 || years > 150) {
        return { years: '', months: '', days: '' };
    }

    return {
        years: String(years),
        months: String(months),
        days: String(days),
    };
}

export function calculateDobFromAge(years = '', months = '', days = '', asOfDate = new Date()) {
    const hasYears = years !== '' && years !== null && !isNaN(years);
    const hasMonths = months !== '' && months !== null && !isNaN(months);
    const hasDays = days !== '' && days !== null && !isNaN(days);

    if (!hasYears && !hasMonths && !hasDays) {
        return '';
    }

    const y = hasYears ? Math.max(0, parseInt(years, 10)) : 0;
    const m = hasMonths ? Math.max(0, parseInt(months, 10)) : 0;
    const d = hasDays ? Math.max(0, parseInt(days, 10)) : 0;

    const baseDate = parseAsOfDate(asOfDate);
    let targetYear = baseDate.getFullYear() - y;
    let targetMonth = baseDate.getMonth() - m;
    let targetDate = baseDate.getDate() - d;

    // Borrow days if targetDate < 1
    while (targetDate < 1) {
        targetMonth -= 1;
        const daysInPrevMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
        targetDate += daysInPrevMonth;
    }

    // Borrow months if targetMonth < 0
    while (targetMonth < 0) {
        targetMonth += 12;
        targetYear -= 1;
    }

    // Cap to maximum days in the target month (e.g. Feb 30 -> Feb 28/29)
    const maxDaysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    if (targetDate > maxDaysInTargetMonth) {
        targetDate = maxDaysInTargetMonth;
    }

    const yyyy = String(targetYear).padStart(4, '0');
    const mm = String(targetMonth + 1).padStart(2, '0');
    const dd = String(targetDate).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
}

export function formatAgeSummary(years, months, days) {
    const parts = [];
    const y = parseInt(years, 10);
    const m = parseInt(months, 10);
    const d = parseInt(days, 10);

    if (!isNaN(y) && y > 0) parts.push(`${y} yrs`);
    if (!isNaN(m) && m > 0) parts.push(`${m} mo`);
    if ((isNaN(y) || y === 0) && !isNaN(d) && d > 0) parts.push(`${d} days`);

    if (parts.length === 0) {
        if (!isNaN(y) && y === 0) return '0 yrs';
        return '—';
    }
    return parts.join(' ');
}
