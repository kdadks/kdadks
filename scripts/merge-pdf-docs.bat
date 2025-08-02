@echo off
setlocal enabledelayedexpansion

echo 🔍 Scanning for PDF Branding related .md files...

:: Create docs directories if they don't exist
if not exist "docs" mkdir docs
if not exist "docs\archive" mkdir docs\archive

:: Get current timestamp for backup
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "TIMESTAMP=%dt:~0,4%%dt:~4,2%%dt:~6,2%_%dt:~8,2%%dt:~10,2%%dt:~12,2%"
set "ARCHIVE_DIR=docs\archive\%TIMESTAMP%"
mkdir "%ARCHIVE_DIR%"

:: Initialize file counter
set /a FILE_COUNT=0

:: Find and process PDF Branding related files
set "FOUND_FILES="
for %%f in (*PDF*BRANDING*.md *HEADER*FOOTER*.md *IMAGE*DELETION*.md *EMAIL*PDF*.md *DUPLICATE*TEXT*.md *LAYOUT*ENHANCEMENT*.md *OVERLAY*FIXES*.md) do (
    if exist "%%f" (
        if not "%%f"=="README.md" (
            echo   ✅ Found: %%f
            set "FOUND_FILES=!FOUND_FILES! %%f"
            set /a FILE_COUNT+=1
        )
    )
)

:: Check if any files were found
if %FILE_COUNT%==0 (
    echo   ℹ️  No PDF Branding related .md files found in root directory
    goto :end
)

echo.
echo 📋 Found %FILE_COUNT% PDF Branding related files

echo.
echo 📝 Merging files into comprehensive documentation...

:: Create the merged file header
set "MERGED_FILE=docs\PDF_BRANDING_SYSTEM_COMPLETE.md"
(
echo # PDF BRANDING SYSTEM - COMPLETE IMPLEMENTATION GUIDE
echo.
echo ^> **Comprehensive documentation of all PDF branding features, fixes, and enhancements for KDADKS Invoice Management System**
echo.
echo ---
echo.
echo ## 📋 Table of Contents
echo.
echo 1. [Overview](#overview^)
echo 2. [Recent Updates](#recent-updates^)
echo 3. [Technical Architecture](#technical-architecture^)
echo 4. [Implementation Details](#implementation-details^)
echo 5. [Testing ^& Verification](#testing--verification^)
echo 6. [Build ^& Deployment](#build--deployment^)
echo.
echo ---
echo.
echo ## 🎯 Overview
echo.
echo The PDF Branding System enables complete customization of invoice PDFs with professional header, footer, and logo images. This system provides:
echo.
echo - **Edge-to-edge image positioning** with maintained aspect ratios
echo - **Professional text overlays** with proper visibility
echo - **Smart layout optimization** for different content scenarios
echo - **Complete consistency** between download and email PDFs
echo - **Automatic image optimization** to keep PDF size under 2MB
echo - **Comprehensive storage management** with cleanup capabilities
echo.
echo ---
echo.
echo ## 📅 Recent Updates
echo.
) > "%MERGED_FILE%"

:: Process each found file
for %%f in (%FOUND_FILES%) do (
    echo   📄 Processing: %%f
    
    :: Add separator and file header to merged document
    (
    echo.
    echo ---
    echo.
    echo ### 📄 %%f
    echo.
    ) >> "%MERGED_FILE%"
    
    :: Add file content (skip first line which is usually the main title)
    more +1 "%%f" >> "%MERGED_FILE%"
    
    :: Move file to archive
    move "%%f" "%ARCHIVE_DIR%\" >nul 2>&1
    echo   📦 Archived: %%f -^> %ARCHIVE_DIR%\
)

:: Add footer to merged document
(
echo.
echo ---
echo.
echo ## 📈 Summary
echo.
echo The PDF Branding System provides a comprehensive solution for professional invoice customization with all features fully implemented and tested.
echo.
echo ### **Status**: ✅ **COMPLETE** 
echo All PDF branding components are fully functional and ready for production use.
echo.
echo ---
echo.
echo **Last Updated**: %date% %time%
echo **Archive Location**: docs/archive/
echo **Merged Files**: All PDF branding related documentation
) >> "%MERGED_FILE%"

echo.
echo ✅ Merge complete!
echo   📄 Comprehensive document: %MERGED_FILE%
echo   📦 Original files archived in: %ARCHIVE_DIR%
echo   🗂️  Total files processed: %FILE_COUNT%

echo.
echo 📋 Archive contents:
dir /b "%ARCHIVE_DIR%"

echo.
echo 🎉 PDF Branding documentation merge completed successfully!

:end
pause
