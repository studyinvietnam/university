#include <iostream>
#include <string>
#include <filesystem>
#include <cstdlib>
#include <csignal>
#include <chrono>
#include <fstream>
#include <algorithm>
#include <cctype>
#include <vector>
#include <stdexcept>
#include <memory>

#include <windows.h>

namespace fs = std::filesystem;

// ============================================================
// GLOBAL
// ============================================================

volatile sig_atomic_t ctrlCPressed = 0;

void handleCtrlC(int)
{
    ctrlCPressed = 1;
}

// ============================================================
// LAY THU MUC CHUA FILE EXE
// ============================================================

fs::path getExeDir()
{
    wchar_t buffer[MAX_PATH];

    GetModuleFileNameW(
        NULL,
        buffer,
        MAX_PATH
    );

    return fs::path(buffer).parent_path();
}

// ============================================================
// LAY DUONG DAN COMPILER
// ============================================================

std::wstring getCompilerPath(
    const std::wstring& compiler)
{
    fs::path exeDir =
        getExeDir();

    fs::path compilerPath =
        exeDir /
        L"mingw64" /
        L"mingw32" /
        L"bin" /
        compiler;

    if (fs::exists(compilerPath))
    {
        return L"\"" +
               compilerPath.wstring() +
               L"\"";
    }

    return compiler;
}

// ============================================================
// TRIM
// ============================================================

std::wstring trim(
    const std::wstring& str)
{
    size_t start =
        str.find_first_not_of(
            L" \t\r\n"
        );

    if (start == std::wstring::npos)
        return L"";

    size_t end =
        str.find_last_not_of(
            L" \t\r\n"
        );

    return str.substr(
        start,
        end - start + 1
    );
}

// ============================================================
// BO DAU "
// ============================================================

std::wstring removeQuotes(
    const std::wstring& path)
{
    std::wstring result =
        trim(path);

    if (
        result.size() >= 2 &&
        result.front() == L'"' &&
        result.back() == L'"'
    )
    {
        result =
            result.substr(
                1,
                result.size() - 2
            );

        result =
            trim(result);
    }

    return result;
}

// ============================================================
// KIEM TRA URL
// ============================================================

bool isUrl(
    const std::wstring& input)
{
    std::wstring value =
        trim(input);

    return
        value.rfind(
            L"http://",
            0
        ) == 0
        ||
        value.rfind(
            L"https://",
            0
        ) == 0;
}

// ============================================================
// TAO TEN TAM
// ============================================================

std::wstring generateTempName(
    const std::wstring& prefix,
    const std::wstring& extension)
{
    auto now =
        std::chrono::high_resolution_clock::now()
        .time_since_epoch()
        .count();

    return
        prefix +
        std::to_wstring(now) +
        extension;
}

// ============================================================
// RAII CLEANUP
//
// Dung cho truong hop chuong trinh ket thuc binh thuong.
// ============================================================

class TempCleanupGuard
{
private:

    fs::path target;

    bool directory;

public:

    explicit TempCleanupGuard(
        const fs::path& path,
        bool isDirectory = false)
        : target(path),
          directory(isDirectory)
    {
    }

    TempCleanupGuard(
        const TempCleanupGuard&) = delete;

    TempCleanupGuard& operator=(
        const TempCleanupGuard&) = delete;

    ~TempCleanupGuard() noexcept
    {
        cleanup();
    }

    void cleanup() noexcept
    {
        if (target.empty())
            return;

        for (
            int attempt = 0;
            attempt < 10;
            ++attempt
        )
        {
            try
            {
                if (!fs::exists(target))
                    return;

                if (directory)
                {
                    fs::remove_all(
                        target
                    );
                }
                else
                {
                    fs::remove(
                        target
                    );
                }

                if (!fs::exists(target))
                    return;
            }
            catch (...)
            {
            }

            Sleep(100);
        }

        // Neu van bi khoa thi yeu cau Windows
        // xoa o lan khoi dong tiep theo.

        MoveFileExW(
            target.wstring().c_str(),
            NULL,
            MOVEFILE_DELAY_UNTIL_REBOOT
        );
    }
};

// ============================================================
// TAO THU MUC TAM
// ============================================================

fs::path createTempDirectory(
    const std::wstring& prefix)
{
    fs::path base =
        fs::temp_directory_path();

    fs::path dir;

    for (
        int i = 0;
        i < 100;
        ++i
    )
    {
        dir =
            base /
            generateTempName(
                prefix,
                L""
            );

        try
        {
            if (
                fs::create_directory(
                    dir
                )
            )
            {
                return dir;
            }
        }
        catch (...)
        {
        }
    }

    throw std::runtime_error(
        "Khong tao duoc thu muc tam."
    );
}

// ============================================================
// CLEANUP WORKER
//
// DAY LA PHAN QUAN TRONG NHAT.
//
// Worker doc lap se:
// 1. Cho CodeQuickRunner.exe ket thuc.
// 2. Doi them 1 giay.
// 3. Quet %TEMP%.
// 4. Xoa tat ca folder code_runner_*.
//
// Hoat dong khi:
// - Chon Thoat
// - Ctrl+C
// - Bam X CMD
// - End Task
// ============================================================

void scheduleCleanupAfterExit()
{
    DWORD currentPid =
        GetCurrentProcessId();

    std::wstring command =
        L"powershell.exe "
        L"-NoProfile "
        L"-NonInteractive "
        L"-WindowStyle Hidden "
        L"-Command "
        L"\""

        // PID cua CodeQuickRunner
        L"$pidToWait="
        + std::to_wstring(currentPid)
        + L"; "

        // Cho CodeQuickRunner.exe ket thuc
        L"while("
        L"Get-Process -Id $pidToWait "
        L"-ErrorAction SilentlyContinue"
        L"){"
        L"Start-Sleep -Milliseconds 200"
        L"}; "

        // Doi them de process con giai phong file
        L"Start-Sleep -Milliseconds 1000; "

        // Lay TEMP
        L"$temp=[System.IO.Path]::GetTempPath(); "

        // Tim tat ca code_runner_*
        L"Get-ChildItem "
        L"-LiteralPath $temp "
        L"-Directory "
        L"-Filter 'code_runner_*' "
        L"-ErrorAction SilentlyContinue "
        L"| ForEach-Object { "

        // Thu xoa toi da 10 lan
        L"for($i=0;$i -lt 10;$i++){"

        L"try{"

        L"Remove-Item "
        L"-LiteralPath $_.FullName "
        L"-Recurse "
        L"-Force "
        L"-ErrorAction Stop; "

        L"break"

        L"}"
        L"catch{"

        L"Start-Sleep -Milliseconds 300"

        L"}"

        L"}"

        L"}"

        L"\"";

    STARTUPINFOW si;
    PROCESS_INFORMATION pi;

    ZeroMemory(
        &si,
        sizeof(si)
    );

    ZeroMemory(
        &pi,
        sizeof(pi)
    );

    si.cb =
        sizeof(si);

    std::vector<wchar_t> buffer(
        command.begin(),
        command.end()
    );

    buffer.push_back(
        L'\0'
    );

    BOOL success =
        CreateProcessW(
            NULL,
            buffer.data(),
            NULL,
            NULL,
            FALSE,
            CREATE_NO_WINDOW |
            CREATE_UNICODE_ENVIRONMENT,
            NULL,
            NULL,
            &si,
            &pi
        );

    if (success)
    {
        CloseHandle(
            pi.hProcess
        );

        CloseHandle(
            pi.hThread
        );
    }
}

// ============================================================
// HIEN THI MENU
// ============================================================

void showMenu()
{
    std::wcout
        << L"\n";

    std::wcout
        << L"============================================\n";

    std::wcout
        << L"             CODE QUICK RUNNER\n";

    std::wcout
        << L"============================================\n";

    std::wcout
        << L"[1] C\n";

    std::wcout
        << L"[2] C++\n";

    std::wcout
        << L"[3] Python\n";

    std::wcout
        << L"[4] Java\n";

    std::wcout
        << L"[0] Thoat\n";

    std::wcout
        << L"============================================\n";
}

// ============================================================
// CHAY LENH WINDOWS
// ============================================================

int runCommand(
    const std::wstring& command,
    const fs::path& workingDirectory = fs::path(),
    bool showExitCode = true)
{
    STARTUPINFOW si;
    PROCESS_INFORMATION pi;

    ZeroMemory(
        &si,
        sizeof(si)
    );

    ZeroMemory(
        &pi,
        sizeof(pi)
    );

    si.cb =
        sizeof(si);

    DWORD creationFlags =
        CREATE_NEW_PROCESS_GROUP |
        CREATE_UNICODE_ENVIRONMENT;

    std::vector<wchar_t> buffer(
        command.begin(),
        command.end()
    );

    buffer.push_back(
        L'\0'
    );

    const wchar_t* cwd =
        NULL;

    std::wstring cwdBuffer;

    if (!workingDirectory.empty())
    {
        cwdBuffer =
            workingDirectory.wstring();

        cwd =
            cwdBuffer.c_str();
    }

    BOOL success =
        CreateProcessW(
            NULL,
            buffer.data(),
            NULL,
            NULL,
            TRUE,
            creationFlags,
            NULL,
            cwd,
            &si,
            &pi
        );

    if (!success)
    {
        DWORD errorCode =
            GetLastError();

        std::wcerr
            << L"\n[ERROR] Khong the chay chuong trinh.\n";

        std::wcerr
            << L"Windows Error: "
            << errorCode
            << L"\n";

        std::wcerr
            << L"Command: "
            << command
            << L"\n";

        return -1;
    }

    while (true)
    {
        DWORD waitResult =
            WaitForSingleObject(
                pi.hProcess,
                100
            );

        if (
            waitResult ==
            WAIT_OBJECT_0
        )
        {
            break;
        }

        if (
            waitResult ==
            WAIT_FAILED
        )
        {
            std::wcerr
                << L"\n[ERROR] WaitForSingleObject that bai.\n";

            break;
        }

        if (ctrlCPressed)
        {
            std::wcout
                << L"\n\n[CTRL+C] Dang dung chuong trinh...\n";

            if (
                !GenerateConsoleCtrlEvent(
                    CTRL_BREAK_EVENT,
                    pi.dwProcessId
                )
            )
            {
                TerminateProcess(
                    pi.hProcess,
                    1
                );
            }

            DWORD childWait =
                WaitForSingleObject(
                    pi.hProcess,
                    1500
                );

            if (
                childWait !=
                WAIT_OBJECT_0
            )
            {
                TerminateProcess(
                    pi.hProcess,
                    1
                );

                WaitForSingleObject(
                    pi.hProcess,
                    3000
                );
            }

            break;
        }
    }

    DWORD exitCode =
        1;

    if (
        !GetExitCodeProcess(
            pi.hProcess,
            &exitCode
        )
    )
    {
        std::wcerr
            << L"\n[WARNING] Khong doc duoc exit code.\n";
    }

    CloseHandle(
        pi.hProcess
    );

    CloseHandle(
        pi.hThread
    );

    if (showExitCode)
    {
        std::wcout
            << L"\n[EXIT CODE] "
            << exitCode
            << L"\n";
    }

    return static_cast<int>(
        exitCode
    );
}

// ============================================================
// TAI FILE TU URL
// ============================================================

bool downloadFileFromUrl(
    const std::wstring& url,
    const fs::path& outputFile)
{
    std::wcout
        << L"\n[DOWNLOAD] Dang tai source tu URL...\n";

    std::wcout
        << L"           "
        << url
        << L"\n";

    std::wstring command =
        L"curl.exe "
        L"-L "
        L"--fail "
        L"--silent "
        L"--show-error "
        L"-o \""
        + outputFile.wstring()
        + L"\" \""
        + url
        + L"\"";

    int result =
        runCommand(
            command,
            fs::path(),
            false
        );

    if (
        result != 0 ||
        !fs::exists(outputFile)
    )
    {
        std::wcout
            << L"\n[ERROR] Khong tai duoc file tu URL.\n";

        return false;
    }

    try
    {
        if (
            fs::file_size(
                outputFile
            ) == 0
        )
        {
            std::wcout
                << L"\n[ERROR] File tai ve rong.\n";

            return false;
        }
    }
    catch (...)
    {
    }

    std::wcout
        << L"[OK] Tai source thanh cong.\n";

    return true;
}

// ============================================================
// LAY TEN FILE TU URL
// ============================================================

std::wstring getFileNameFromUrl(
    const std::wstring& url)
{
    std::wstring fileName =
        L"source";

    size_t lastSlash =
        url.find_last_of(
            L'/'
        );

    if (
        lastSlash !=
            std::wstring::npos
        &&
        lastSlash + 1 <
            url.size()
    )
    {
        fileName =
            url.substr(
                lastSlash + 1
            );
    }

    // Bo query string

    size_t queryPos =
        fileName.find(
            L'?'
        );

    if (
        queryPos !=
        std::wstring::npos
    )
    {
        fileName =
            fileName.substr(
                0,
                queryPos
            );
    }

    // Bo fragment

    size_t fragmentPos =
        fileName.find(
            L'#'
        );

    if (
        fragmentPos !=
        std::wstring::npos
    )
    {
        fileName =
            fileName.substr(
                0,
                fragmentPos
            );
    }

    if (
        fileName.empty()
    )
    {
        fileName =
            L"source";
    }

    return fileName;
}

// ============================================================
// SUA EXTENSION CHO FILE TAI TU URL
//
// Link online (raw, paste, gist...) thuong khong co duoi
// file dung (.cpp/.c/.py/.java) nen buoc kiem tra extension
// ben duoi se bao loi du da tai thanh cong. Ham nay chi doi
// lai ten file TAI VE cho khop voi ngon ngu da chon, khong
// dong gi den luong xu ly file local va khong doi co che
// luu tam hien tai.
// ============================================================

std::wstring fixExtensionForChoice(
    const std::wstring& fileName,
    const std::wstring& choice)
{
    std::wstring ext =
        fs::path(fileName).extension().wstring();

    std::transform(
        ext.begin(),
        ext.end(),
        ext.begin(),
        ::towlower
    );

    std::wstring defaultExt;

    bool valid =
        false;

    if (choice == L"1")
    {
        defaultExt = L".c";

        valid =
            (ext == L".c");
    }
    else if (choice == L"2")
    {
        defaultExt = L".cpp";

        valid =
            (ext == L".cpp") ||
            (ext == L".cc") ||
            (ext == L".cxx");
    }
    else if (choice == L"3")
    {
        defaultExt = L".py";

        valid =
            (ext == L".py");
    }
    else if (choice == L"4")
    {
        defaultExt = L".java";

        valid =
            (ext == L".java");
    }
    else
    {
        return fileName;
    }

    if (valid)
    {
        return fileName;
    }

    return
        fs::path(fileName).stem().wstring() +
        defaultExt;
}

// ============================================================
// CHAY EXE
// ============================================================

int runExecutable(
    const fs::path& exePath,
    const fs::path& workingDirectory = fs::path())
{
    STARTUPINFOW si;
    PROCESS_INFORMATION pi;

    ZeroMemory(
        &si,
        sizeof(si)
    );

    ZeroMemory(
        &pi,
        sizeof(pi)
    );

    si.cb =
        sizeof(si);

    std::wstring commandLine =
        L"\""
        + exePath.wstring()
        + L"\"";

    std::vector<wchar_t> commandBuffer(
        commandLine.begin(),
        commandLine.end()
    );

    commandBuffer.push_back(
        L'\0'
    );

    std::wstring cwdBuffer;

    const wchar_t* cwd =
        NULL;

    if (!workingDirectory.empty())
    {
        cwdBuffer =
            workingDirectory.wstring();

        cwd =
            cwdBuffer.c_str();
    }

    BOOL success =
        CreateProcessW(
            exePath.wstring().c_str(),
            commandBuffer.data(),
            NULL,
            NULL,
            TRUE,
            CREATE_NEW_PROCESS_GROUP |
            CREATE_UNICODE_ENVIRONMENT,
            NULL,
            cwd,
            &si,
            &pi
        );

    if (!success)
    {
        DWORD errorCode =
            GetLastError();

        std::wcerr
            << L"\n[ERROR] Khong the khoi dong EXE.\n";

        std::wcerr
            << L"Windows Error: "
            << errorCode
            << L"\n";

        return -1;
    }

    while (true)
    {
        DWORD waitResult =
            WaitForSingleObject(
                pi.hProcess,
                100
            );

        if (
            waitResult ==
            WAIT_OBJECT_0
        )
        {
            break;
        }

        if (
            waitResult ==
            WAIT_FAILED
        )
        {
            std::wcerr
                << L"\n[ERROR] Khong the doi EXE.\n";

            break;
        }

        if (ctrlCPressed)
        {
            std::wcout
                << L"\n\n[CTRL+C] Dang dung chuong trinh...\n";

            if (
                !GenerateConsoleCtrlEvent(
                    CTRL_BREAK_EVENT,
                    pi.dwProcessId
                )
            )
            {
                TerminateProcess(
                    pi.hProcess,
                    1
                );
            }

            if (
                WaitForSingleObject(
                    pi.hProcess,
                    1500
                ) != WAIT_OBJECT_0
            )
            {
                TerminateProcess(
                    pi.hProcess,
                    1
                );

                WaitForSingleObject(
                    pi.hProcess,
                    3000
                );
            }

            break;
        }
    }

    DWORD exitCode =
        1;

    if (
        !GetExitCodeProcess(
            pi.hProcess,
            &exitCode
        )
    )
    {
        std::wcerr
            << L"\n[WARNING] Khong doc duoc exit code.\n";
    }

    CloseHandle(
        pi.hProcess
    );

    CloseHandle(
        pi.hThread
    );

    std::wcout
        << L"\n[EXIT CODE] "
        << exitCode
        << L"\n";

    return static_cast<int>(
        exitCode
    );
}

// ============================================================
// CHAY C
// ============================================================

void runC(
    const fs::path& source)
{
    fs::path tempDir;

    try
    {
        tempDir =
            createTempDirectory(
                L"code_runner_c_"
            );
    }
    catch (...)
    {
        std::wcout
            << L"\n[ERROR] Khong tao duoc thu muc tam cho C.\n";

        return;
    }

    TempCleanupGuard cleanupDir(
        tempDir,
        true
    );

    fs::path exePath =
        tempDir /
        L"program.exe";

    std::wcout
        << L"\n[1/2] Dang compile C...\n";

    std::wcout
        << L"      "
        << source.wstring()
        << L"\n";

    std::wstring gcc =
        getCompilerPath(
            L"gcc.exe"
        );

    std::wstring compileCommand =
        gcc
        + L" -std=c17 -O2 "
        + L"-static -static-libgcc \""
        + source.wstring()
        + L"\" -o \""
        + exePath.wstring()
        + L"\"";

    int result =
        runCommand(
            compileCommand,
            fs::path(),
            false
        );

    if (result != 0)
    {
        std::wcout
            << L"\n[ERROR] Compile C that bai!\n";

        return;
    }

    std::wcout
        << L"\n[OK] Compile thanh cong.\n";

    std::wcout
        << L"[2/2] Dang chay...\n";

    std::wcout
        << L"--------------------------------------------\n";

    ctrlCPressed =
        0;

    int runResult =
        runExecutable(
            exePath,
            source.parent_path()
        );

    if (
        runResult == 0
    )
    {
        std::wcout
            << L"\n[FINISHED] Chuong trinh da ket thuc binh thuong.\n";
    }
    else
    {
        std::wcout
            << L"\n[CRASH/ERROR] Chuong trinh ket thuc voi ma: "
            << runResult
            << L"\n";

        if (
            static_cast<unsigned int>(
                runResult
            ) ==
            0xC0000005u
        )
        {
            std::wcout
                << L"[WINDOWS] 0xC0000005 = Access Violation trong process con.\n";
        }
    }

    std::wcout
        << L"\n--------------------------------------------\n";

    if (ctrlCPressed)
    {
        std::wcout
            << L"[CTRL+C] Da dung chuong trinh.\n";
    }
}

// ============================================================
// CHAY C++
// ============================================================

void runCpp(
    const fs::path& source)
{
    fs::path tempDir;

    try
    {
        tempDir =
            createTempDirectory(
                L"code_runner_cpp_"
            );
    }
    catch (...)
    {
        std::wcout
            << L"\n[ERROR] Khong tao duoc thu muc tam cho C++.\n";

        return;
    }

    TempCleanupGuard cleanupDir(
        tempDir,
        true
    );

    fs::path exePath =
        tempDir /
        L"program.exe";

    std::wcout
        << L"\n[1/2] Dang compile C++...\n";

    std::wcout
        << L"      "
        << source.wstring()
        << L"\n";

    std::wstring gpp =
        getCompilerPath(
            L"g++.exe"
        );

    std::wstring compileCommand =
        gpp
        + L" -std=c++17 -O2 "
        + L"-static -static-libgcc "
        + L"-static-libstdc++ \""
        + source.wstring()
        + L"\" -o \""
        + exePath.wstring()
        + L"\"";

    int result =
        runCommand(
            compileCommand,
            fs::path(),
            false
        );

    if (
        result != 0
    )
    {
        std::wcout
            << L"\n[ERROR] Compile C++ that bai!\n";

        return;
    }

    std::wcout
        << L"\n[OK] Compile thanh cong.\n";

    std::wcout
        << L"[2/2] Dang chay...\n";

    std::wcout
        << L"--------------------------------------------\n";

    ctrlCPressed =
        0;

    int runResult =
        runExecutable(
            exePath,
            source.parent_path()
        );

    if (
        runResult == 0
    )
    {
        std::wcout
            << L"\n[FINISHED] Chuong trinh da ket thuc binh thuong.\n";
    }
    else
    {
        std::wcout
            << L"\n[CRASH/ERROR] Chuong trinh ket thuc voi ma: "
            << runResult
            << L"\n";

        if (
            static_cast<unsigned int>(
                runResult
            ) ==
            0xC0000005u
        )
        {
            std::wcout
                << L"[WINDOWS] 0xC0000005 = Access Violation trong process con.\n";
        }
    }

    std::wcout
        << L"\n--------------------------------------------\n";

    if (ctrlCPressed)
    {
        std::wcout
            << L"[CTRL+C] Da dung chuong trinh.\n";
    }
}

// ============================================================
// CHAY PYTHON
// ============================================================

void runPython(
    const fs::path& source)
{
    std::wcout
        << L"\n[RUN] Dang chay Python...\n";

    std::wcout
        << L"--------------------------------------------\n";

    ctrlCPressed =
        0;

    runCommand(
        L"python -B \""
        + source.wstring()
        + L"\""
    );

    std::wcout
        << L"\n--------------------------------------------\n";

    if (
        ctrlCPressed
    )
    {
        std::wcout
            << L"[CTRL+C] Da dung Python.\n";
    }
    else
    {
        std::wcout
            << L"[FINISHED] Python da ket thuc.\n";
    }
}

// ============================================================
// CHAY JAVA
// ============================================================

void runJava(
    const fs::path& source)
{
    fs::path tempDir;

    try
    {
        tempDir =
            createTempDirectory(
                L"code_runner_java_"
            );
    }
    catch (...)
    {
        std::wcout
            << L"\n[ERROR] Khong tao duoc thu muc tam cho Java.\n";

        return;
    }

    TempCleanupGuard cleanupDir(
        tempDir,
        true
    );

    std::wstring fileName =
        source.stem().wstring();

    std::wcout
        << L"\n[1/2] Dang compile Java...\n";

    std::wstring compileCommand =
        L"javac -d \""
        + tempDir.wstring()
        + L"\" \""
        + source.wstring()
        + L"\"";

    int result =
        runCommand(
            compileCommand
        );

    if (
        result != 0
    )
    {
        std::wcout
            << L"\n[ERROR] Compile Java that bai!\n";

        return;
    }

    std::wcout
        << L"\n[OK] Compile thanh cong.\n";

    std::wcout
        << L"[2/2] Dang chay...\n";

    std::wcout
        << L"--------------------------------------------\n";

    ctrlCPressed =
        0;

    int runResult =
        runCommand(
            L"cmd /c cd /d \""
            + tempDir.wstring()
            + L"\" && java -cp \""
            + tempDir.wstring()
            + L"\" "
            + fileName,
            fs::path(),
            true
        );

    std::wcout
        << L"\n--------------------------------------------\n";

    if (
        ctrlCPressed
    )
    {
        std::wcout
            << L"[CTRL+C] Da dung Java.\n";
    }
    else if (
        runResult == 0
    )
    {
        std::wcout
            << L"[FINISHED] Java da ket thuc binh thuong.\n";
    }
    else
    {
        std::wcout
            << L"[ERROR] Java ket thuc voi ma: "
            << runResult
            << L"\n";
    }
}

// ============================================================
// MAIN
// ============================================================

int main()
{
    SetConsoleOutputCP(
        CP_UTF8
    );

    SetConsoleCP(
        CP_UTF8
    );

    SetConsoleTitleW(
        L"Code Quick Runner"
    );

    signal(
        SIGINT,
        handleCtrlC
    );

    // ========================================================
    // BAT CLEANUP WORKER MOT LAN DUY NHAT
    //
    // Worker se quan ly TOAN BO:
    //
    // %TEMP%\code_runner_download_*
    // %TEMP%\code_runner_c_*
    // %TEMP%\code_runner_cpp_*
    // %TEMP%\code_runner_java_*
    //
    // Khong can goi lai trong tung ham.
    // ========================================================

    scheduleCleanupAfterExit();

    while (true)
    {
        showMenu();

        std::wcout
            << L"Chon ngon ngu: ";

        std::wcout.flush();

        std::wstring choice;

        std::getline(
            std::wcin,
            choice
        );

        choice =
            trim(choice);

        // ====================================================
        // THOAT
        // ====================================================

        if (
            choice == L"0" ||
            choice == L"exit" ||
            choice == L"EXIT"
        )
        {
            break;
        }

        // ====================================================
        // KIEM TRA LUA CHON
        // ====================================================

        if (
            choice != L"1" &&
            choice != L"2" &&
            choice != L"3" &&
            choice != L"4"
        )
        {
            std::wcout
                << L"\n[ERROR] Lua chon khong hop le!\n";

            continue;
        }

        // ====================================================
        // NGON NGU
        // ====================================================

        std::wstring language;

        if (
            choice == L"1"
        )
        {
            language =
                L"C";
        }
        else if (
            choice == L"2"
        )
        {
            language =
                L"C++";
        }
        else if (
            choice == L"3"
        )
        {
            language =
                L"Python";
        }
        else
        {
            language =
                L"Java";
        }

        std::wcout
            << L"\n============================================\n";

        std::wcout
            << L"Ngon ngu: "
            << language
            << L"\n";

        std::wcout
            << L"Paste duong dan file code:\n";

        std::wcout
            << language
            << L" > ";

        // ====================================================
        // NHAP PATH / URL
        // ====================================================

        std::wstring inputPath;

        std::getline(
            std::wcin,
            inputPath
        );

        inputPath =
            removeQuotes(
                inputPath
            );

        if (
            inputPath.empty()
        )
        {
            continue;
        }

        if (
            inputPath == L"exit" ||
            inputPath == L"EXIT"
        )
        {
            break;
        }

        // ====================================================
        // SOURCE
        // ====================================================

        fs::path source;

        if (
            isUrl(inputPath)
        )
        {
            // =================================================
            // DOWNLOAD ONLINE
            // =================================================

            fs::path tempDir;

            try
            {
                tempDir =
                    createTempDirectory(
                        L"code_runner_download_"
                    );
            }
            catch (...)
            {
                std::wcout
                    << L"\n[ERROR] Khong tao duoc thu muc tam.\n";

                continue;
            }

            std::wstring fileName =
                getFileNameFromUrl(
                    inputPath
                );

            fileName =
                fixExtensionForChoice(
                    fileName,
                    choice
                );

            source =
                tempDir /
                fileName;

            if (
                !downloadFileFromUrl(
                    inputPath,
                    source
                )
            )
            {
                continue;
            }

            std::wcout
                << L"[TEMP] Source: "
                << source.wstring()
                << L"\n";
        }
        else
        {
            // =================================================
            // FILE LOCAL
            // =================================================

            source =
                fs::path(
                    inputPath
                );

            if (
                !fs::exists(source)
            )
            {
                std::wcout
                    << L"\n[ERROR] Khong tim thay file:\n";

                std::wcout
                    << source.wstring()
                    << L"\n";

                continue;
            }
        }

        // ====================================================
        // KIEM TRA FILE
        // ====================================================

        if (
            !fs::is_regular_file(
                source
            )
        )
        {
            std::wcout
                << L"\n[ERROR] Duong dan khong phai file.\n";

            continue;
        }

        // ====================================================
        // EXTENSION
        // ====================================================

        std::wstring extension =
            source.extension().wstring();

        std::transform(
            extension.begin(),
            extension.end(),
            extension.begin(),
            ::towlower
        );

        // ====================================================
        // C
        // ====================================================

        if (
            choice == L"1" &&
            extension != L".c"
        )
        {
            std::wcout
                << L"\n[ERROR] C can file .c\n";

            continue;
        }

        // ====================================================
        // C++
        // ====================================================

        if (
            choice == L"2" &&
            extension != L".cpp" &&
            extension != L".cc" &&
            extension != L".cxx"
        )
        {
            std::wcout
                << L"\n[ERROR] C++ can file .cpp / .cc / .cxx\n";

            continue;
        }

        // ====================================================
        // PYTHON
        // ====================================================

        if (
            choice == L"3" &&
            extension != L".py"
        )
        {
            std::wcout
                << L"\n[ERROR] Python can file .py\n";

            continue;
        }

        // ====================================================
        // JAVA
        // ====================================================

        if (
            choice == L"4" &&
            extension != L".java"
        )
        {
            std::wcout
                << L"\n[ERROR] Java can file .java\n";

            continue;
        }

        // ====================================================
        // CHAY
        // ====================================================

        if (
            choice == L"1"
        )
        {
            runC(
                source
            );
        }
        else if (
            choice == L"2"
        )
        {
            runCpp(
                source
            );
        }
        else if (
            choice == L"3"
        )
        {
            runPython(
                source
            );
        }
        else if (
            choice == L"4"
        )
        {
            runJava(
                source
            );
        }
    }

    std::wcout
        << L"\nThoat Code Quick Runner.\n";

    return 0;
}