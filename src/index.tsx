import * as React from "react";
import * as ReactDOM from "react-dom";

import A10InteractiveTree, { IDatum } from "./tree";

var treeData: IDatum = {
  name: "Top Level",
  children: [
    {
      name: "Level 2: A",
      children: [
        {
          name: "Son of A"
        },
        {
          name: "Daughter of A"
        }
      ]
    },
    {
      name: "Level 2: B"
    }
  ]
};

ReactDOM.render(
  <A10InteractiveTree height={400} width={800} data={treeData} />,
  document.getElementById("root")
);
