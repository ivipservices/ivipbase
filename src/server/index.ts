import DataBase from "./services/database";
import Auth from "./services/auth";
import Storage from "./services/storage";
import { initializeApp, getApp, getFirstApp, deleteApp, getApps } from "./services/app";

export { initializeApp, getApp, getFirstApp, deleteApp, getApps, DataBase, Auth, Storage };
