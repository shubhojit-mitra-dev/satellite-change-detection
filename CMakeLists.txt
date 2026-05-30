cmake_minimum_required(VERSION 3.20)
project(SatelliteChangeDetection NONE)

# ============================================================
#  CMakeLists.txt — generates the `ez` CLI tool
#
#  Run once:
#    cmake -S . -B build
#
#  This writes an `ez` script to the project root.
#  Then use ez from anywhere inside the project:
#    ez install
#    ez build -s data-service
#    ez run -s api-gateway
# ============================================================

# ── Verify Maven is available ────────────────────────────────
find_program(MVN_EXECUTABLE mvn REQUIRED)
message(STATUS "Maven  : ${MVN_EXECUTABLE}")

# ── Service registry ─────────────────────────────────────────
# To add a new service, append its folder name here.
set(SERVICES
    alert-service
    api-gateway
    change-detection-service
    data-service
    ingestion-service
)

# ── Format services as bash array lines ──────────────────────
set(SERVICES_BASH "")
foreach(SVC ${SERVICES})
    string(APPEND SERVICES_BASH "  ${SVC}\n")
endforeach()

# ── Root path burned into ez at generation time ──────────────
set(EZ_ROOT_DIR "${CMAKE_SOURCE_DIR}")

# ── Generate ez from template ─────────────────────────────────
configure_file(
    "${CMAKE_SOURCE_DIR}/ez.in"
    "${CMAKE_SOURCE_DIR}/ez"
    @ONLY
    NEWLINE_STYLE UNIX
)

# ── Make ez executable ────────────────────────────────────────
file(CHMOD "${CMAKE_SOURCE_DIR}/ez"
    PERMISSIONS
        OWNER_READ OWNER_WRITE OWNER_EXECUTE
        GROUP_READ GROUP_EXECUTE
        WORLD_READ WORLD_EXECUTE
)

message(STATUS "")
message(STATUS "  ✓  ez tool ready → ${CMAKE_SOURCE_DIR}/ez")
message(STATUS "  Run './ez' to see all commands.")
message(STATUS "")
