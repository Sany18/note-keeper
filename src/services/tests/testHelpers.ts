let lastId: string;

const getRandomId = () => {
  lastId = Math.floor(Math.random() * 1000000) + '';
  return lastId;
}

const getLastId = () => lastId;

export const testHelper = {
  getRandomId,
  getLastId,
};
