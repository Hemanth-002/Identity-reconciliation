import express from "express";
import bodyParser from "body-parser";
import getConsolidatedContact from "./api/contacts";

const app = express();

const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post("/identify", getConsolidatedContact);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
