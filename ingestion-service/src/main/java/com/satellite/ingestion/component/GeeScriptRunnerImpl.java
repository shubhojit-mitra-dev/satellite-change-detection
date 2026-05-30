package com.satellite.ingestion.component;

import com.satellite.ingestion.config.GeeConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class GeeScriptRunnerImpl implements GeeScriptRunner {

    private final GeeConfig geeConfig;

    @Override
    public String runScript(String fieldId, double[] aoi, String date1, String date2) throws Exception {
        log.info("Preparing to run GEE script for field: {}", fieldId);

        List<String> command = new ArrayList<>();
        command.add(geeConfig.getPythonPath());
        command.add(geeConfig.getScriptPath());
        command.add(fieldId);
        command.add(String.valueOf(aoi[0])); // lonMin
        command.add(String.valueOf(aoi[1])); // latMin
        command.add(String.valueOf(aoi[2])); // lonMax
        command.add(String.valueOf(aoi[3])); // latMax
        command.add(date1);
        command.add(date2);

        log.info("Executing command: {}", String.join(" ", command));

        ProcessBuilder pb = new ProcessBuilder(command);
        pb.redirectErrorStream(false);
        pb.directory(new java.io.File(geeConfig.getScriptPath()).getParentFile());

        log.info("Starting process builder for GEE script...");
        Process process = pb.start();
        log.info("Process started successfully.");

        String stdout = new String(process.getInputStream().readAllBytes());
        String stderr = new String(process.getErrorStream().readAllBytes());

        log.info("Output completely read from process streams.");
        
        if (!stderr.isBlank()) {
            log.warn("GEE Script STDERR: {}", stderr);
        }

        int exitCode = process.waitFor();
        log.info("GEE script exited with code: {}", exitCode);

        if (exitCode != 0) {
            log.error("GEE script failed with exit code {}. Stderr: {}", exitCode, stderr);
            throw new RuntimeException("GEE script execution failed: " + stderr);
        }

        if (stdout == null || stdout.isBlank()) {
            log.error("GEE script returned empty stdout.");
            throw new RuntimeException("GEE script returned empty output.");
        }

        return stdout;
    }
}
