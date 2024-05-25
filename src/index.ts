import express from "express";
import bodyParser from "body-parser";

const app = express();

const PORT = process.env.PORT || 3000;


app.use(bodyParser.json());

app.post("/identify", (req, res) => {
  res.status(200).json("gooo start your Challenges!!");
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});