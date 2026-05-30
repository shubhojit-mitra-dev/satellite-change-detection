package com.satellite.ingestion.component;

public interface GeeScriptRunner {
    String runScript(double[] aoi, String date1, String date2) throws Exception;
}
