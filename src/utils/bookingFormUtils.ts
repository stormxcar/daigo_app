export const stringParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export const numberParam = (value: string | string[] | undefined) => {
  const parsed = Number(stringParam(value));
  return Number.isFinite(parsed) ? parsed : null;
};

const pad2 = (value: number) => String(value).padStart(2, "0");

export const toVietnamDateInput = (date: Date) =>
  `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;

export const toTimeInput = (date: Date) =>
  `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

export const getInitialSchedule = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() + 30);
  date.setSeconds(0, 0);
  return date;
};
