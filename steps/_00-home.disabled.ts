// import { ApiRouteConfig } from "motia";
// import * as fs from "fs";
// import * as path from "path";

// // steps/00-home.step.ts

// export const config: ApiRouteConfig = {
//   name: "HomePage",
//   type: "api",
//   path: "/",
//   method: "GET",
//   emits: [],  // ← Added this - API routes need this even if empty
// };

// export const handler = async (req: any) => {
//   try {
//     const htmlPath = path.join(process.cwd(), "public", "index.html");
//     const html = fs.readFileSync(htmlPath, "utf-8");
    
//     return {
//       status: 200,
//       headers: {
//         "Content-Type": "text/html",
//       },
//       body: html,
//     };
//   } catch (error: any) {
//     return {
//       status: 500,
//       body: { 
//         error: "Failed to load homepage",
//         message: error.message 
//       },
//     };
//   }
// };

// // steps/00-home.step.ts


import { ApiRouteConfig } from "motia";
import * as fs from "fs";
import * as path from "path";

export const config: ApiRouteConfig = {
  name: "HomePage",
  type: "api",
  path: "/home",
  // path: "/",
  method: "GET",
  emits: [],
};

export const handler = async (req: any) => {
  try {
    const htmlPath = path.join(process.cwd(), "public", "index.html");
    let html = fs.readFileSync(htmlPath, "utf-8");
    
    // Replace localhost:3000 with localhost:3000 for API calls (keep backend on 3000)
    // Frontend will be accessed on different port via simple http-server
    
    return {
      status: 200,
      headers: {
        "Content-Type": "text/html",
      },
      body: html,
    };
  } catch (error: any) {
    return {
      status: 500,
      body: { 
        error: "Failed to load homepage",
        message: error.message 
      },
    };
  }
};