#!/usr/bin/env node
import { runMain } from "citty";
import { mainCommand } from "./main.js";

await runMain(mainCommand);
