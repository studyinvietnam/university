#include <iostream>
#include <string>
#include <filesystem>
#include <cstdlib>
#include <windows.h>
#include <csignal>
#include <chrono>
#include <fstream>
#include <algorithm>
#include <cctype>
#include <vector>
#include <stdexcept>

namespace fs = std::filesystem;

volatile sig_atomic_t ctrlCPressed = 0;

void handleCtrlC(int)
{
    ctrlCPressed = 1;
}

// ============================================================
// Lay thu muc chua file .exe dang chay
// ============================================================

fs::path getExeDir()
{
    wchar_t buffer[MAX_PATH];
    GetModuleFileNameW(NULL, buffer, MAX_PATH);
    return fs::path(buffer).parent_path();
}

// ============================================================
// Lay duong dan day du toi compiler
// Tim trong: <exeDir>\mingw64\mingw32\bin\
// ============================================================

std::wstring getCompilerPath(const std::wstring& compiler)
{
    fs::path exeDir = getExeDir();
    fs::path compilerPath =
        exeDir / L"mingw64" / L"mingw32" / L"bin" / compiler;

    if (fs::exists(compilerPath))
        return L"\"" + compilerPath.wstring() + L"\"";

    // Fallback: dung ten lenh thuong (neu da co trong PATH)
    return compiler;
}

// ============================================================
// Xoa khoang trang dau/cuoi
// ============================================================

std::wstring trim(const std::wstring& str)
{
    size_t start = str.find_first_not_of(L" \t\r\n");
    if (start == std::wstring::npos) return L"";
    size_t end = str.find_last_not_of(L" \t\r\n");
    return str.substr(start, end - start + 1);
}

// ============================================================
// Bo dau " neu user paste duong dan co dau ngoac kep
// ============================================================

std::wstring removeQuotes(const std::wstring& path)
{
    std::wstring result = trim(path);
    if (result.size() >= 2 &&
        result.front() == L'"' &&
        result.back() == L'"')
    {
        result = result.substr(1, result.size() - 2);
        result = trim(result);
    }
    return result;
}

// ============================================================
// Tao ten file / thu muc tam
// ============================================================

std::wstring generateTempName(const std::wstring& prefix,
                              const std::wstring& extension)
{
    auto now =
        std::chrono::high_resolution_clock::now()
        .time_since_epoch()
        .count();

    return prefix + std::to_wstring(now) + extension;
}

// ============================================================
// RAII cleanup guard
// - Tu dong xoa file / thu muc tam khi ra khoi scope
// - Thu xoa nhieu lan vi Windows co the dang giu handle ngan
// - Neu van bi khoa, len lich xoa sau khi restart Windows
// ============================================================

class TempCleanupGuard
{
private:
    fs::path target;
    bool directory;

public:
    explicit TempCleanupGuard(const fs::path& path, bool isDirectory = false)
        : target(path), directory(isDirectory)
    {
    }

    TempCleanupGuard(const TempCleanupGuard&) = delete;
    TempCleanupGuard& operator=(const TempCleanupGuard&) = delete;

    ~TempCleanupGuard() noexcept
    {
        cleanup();
    }

    void cleanup() noexcept
    {
        if (target.empty())
            return;

        for (int attempt = 0; attempt < 10; ++attempt)
        {
            try
            {
                if (!fs::exists(target))
                    return;

                if (directory)
                    fs::remove_all(target);
                else
                    fs::remove(target);

                if (!fs::exists(target))
                    return;
            }
            catch (...) {}

            Sleep(100);
        }

        // Neu Windows van dang khoa file:
        // yeu cau Windows xoa no o lan khoi dong tiep theo.
        MoveFileExW(
            target.wstring().c_str(),
            NULL,
            MOVEFILE_DELAY_UNTIL_REBOOT
        );
    }
};

// ============================================================
// Tao thu muc tam rieng cho moi lan chay
// Uu tien %TEMP% cua Windows.
// Neu %TEMP% nam tren RAM disk thi file se nam tren RAM disk.
// Windows van can executable file-backed de CreateProcessW chay.
// ============================================================

fs::path createTempDirectory(const std::wstring& prefix)
{
    fs::path base = fs::temp_directory_path();
    fs::path dir;

    for (int i = 0; i < 100; ++i)
    {
        dir = base / generateTempName(prefix, L"");

        try
        {
            if (fs::create_directory(dir))
                return dir;
        }
        catch (...) {}
    }

    throw std::runtime_error("Khong tao duoc thu muc tam.");
}

// ============================================================
// Hien thi menu
// ============================================================

void showMenu()
{
    std::wcout << L"\n";
    std::wcout << L"============================================\n";
    std::wcout << L"             CODE QUICK RUNNER\n";
    std::wcout << L"============================================\n";
    std::wcout << L"[1] C\n";
    std::wcout << L"[2] C++\n";
    std::wcout << L"[3] Python\n";
    std::wcout << L"[4] Java\n";
    std::wcout << L"[0] Thoat\n";
    std::wcout << L"============================================\n";
}

// ============================================================
// Chay lenh Windows Unicode
// ============================================================

int runCommand(
    const std::wstring& command,
    const fs::path& workingDirectory = fs::path(),
    bool showExitCode = true)
{
    STARTUPINFOW si;
    PROCESS_INFORMATION pi;

    ZeroMemory(&si, sizeof(si));
    ZeroMemory(&pi, sizeof(pi));
    si.cb = sizeof(si);

    // IMPORTANT:
    // Do not manually force STARTF_USESTDHANDLES here.
    // A console child created from a console runner naturally inherits
    // the current console/stdin/stdout/stderr. Forcing handles can cause
    // subtle Windows/MinGW console issues.
    DWORD creationFlags =
        CREATE_NEW_PROCESS_GROUP |
        CREATE_UNICODE_ENVIRONMENT;

    std::vector<wchar_t> buffer(command.begin(), command.end());
    buffer.push_back(L'\0');

    const wchar_t* cwd = NULL;
    std::wstring cwdBuffer;

    if (!workingDirectory.empty())
    {
        cwdBuffer = workingDirectory.wstring();
        cwd = cwdBuffer.c_str();
    }

    BOOL success = CreateProcessW(
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
        DWORD errorCode = GetLastError();

        std::wcerr << L"\n[ERROR] Khong the chay chuong trinh.\n";
        std::wcerr << L"Windows Error: " << errorCode << L"\n";
        std::wcerr << L"Command: " << command << L"\n";

        return -1;
    }

    while (true)
    {
        DWORD waitResult = WaitForSingleObject(pi.hProcess, 100);

        if (waitResult == WAIT_OBJECT_0)
            break;

        if (waitResult == WAIT_FAILED)
        {
            std::wcerr << L"\n[ERROR] WaitForSingleObject that bai.\n";
            break;
        }

        if (ctrlCPressed)
        {
            std::wcout << L"\n\n[CTRL+C] Dang dung chuong trinh...\n";

            // Try a console break first.
            if (!GenerateConsoleCtrlEvent(
                    CTRL_BREAK_EVENT,
                    pi.dwProcessId))
            {
                // Fallback if the child does not receive the event.
                TerminateProcess(pi.hProcess, 1);
            }

            DWORD childWait =
                WaitForSingleObject(pi.hProcess, 1500);

            if (childWait != WAIT_OBJECT_0)
            {
                TerminateProcess(pi.hProcess, 1);
                WaitForSingleObject(pi.hProcess, 3000);
            }

            break;
        }
    }

    DWORD exitCode = 1;

    if (!GetExitCodeProcess(pi.hProcess, &exitCode))
    {
        std::wcerr << L"\n[WARNING] Khong doc duoc exit code.\n";
    }

    CloseHandle(pi.hProcess);
    CloseHandle(pi.hThread);

    if (showExitCode)
    {
        std::wcout << L"\n[EXIT CODE] " << exitCode << L"\n";
    }

    return static_cast<int>(exitCode);
}

// ============================================================
// Chay file EXE da tao - dung lpApplicationName rieng
// De Windows khong phai tu tach ten EXE tu command line.
// ============================================================

int runExecutable(
    const fs::path& exePath,
    const fs::path& workingDirectory = fs::path())
{
    STARTUPINFOW si;
    PROCESS_INFORMATION pi;

    ZeroMemory(&si, sizeof(si));
    ZeroMemory(&pi, sizeof(pi));
    si.cb = sizeof(si);

    // CreateProcessW can modify lpCommandLine, so it MUST be a writable buffer.
    std::wstring commandLine = L"\"" + exePath.wstring() + L"\"";
    std::vector<wchar_t> commandBuffer(commandLine.begin(), commandLine.end());
    commandBuffer.push_back(L'\0');

    std::wstring cwdBuffer;
    const wchar_t* cwd = NULL;

    if (!workingDirectory.empty())
    {
        cwdBuffer = workingDirectory.wstring();
        cwd = cwdBuffer.c_str();
    }

    BOOL success = CreateProcessW(
        exePath.wstring().c_str(),
        commandBuffer.data(),
        NULL,
        NULL,
        TRUE,
        CREATE_NEW_PROCESS_GROUP | CREATE_UNICODE_ENVIRONMENT,
        NULL,
        cwd,
        &si,
        &pi
    );

    if (!success)
    {
        DWORD errorCode = GetLastError();
        std::wcerr << L"\n[ERROR] Khong the khoi dong EXE.\n";
        std::wcerr << L"Windows Error: " << errorCode << L"\\n";
        std::wcerr << L"EXE: " << exePath.wstring() << L"\\n";
        return -1;
    }

    while (true)
    {
        DWORD waitResult = WaitForSingleObject(pi.hProcess, 100);

        if (waitResult == WAIT_OBJECT_0)
            break;

        if (waitResult == WAIT_FAILED)
        {
            std::wcerr << L"\n[ERROR] Khong the doi EXE.\n";
            break;
        }

        if (ctrlCPressed)
        {
            std::wcout << L"\n\n[CTRL+C] Dang dung chuong trinh...\n";

            // The child is in its own process group. Try graceful console break first.
            if (!GenerateConsoleCtrlEvent(CTRL_BREAK_EVENT, pi.dwProcessId))
            {
                TerminateProcess(pi.hProcess, 1);
            }

            if (WaitForSingleObject(pi.hProcess, 1500) != WAIT_OBJECT_0)
            {
                TerminateProcess(pi.hProcess, 1);
                WaitForSingleObject(pi.hProcess, 3000);
            }
            break;
        }
    }

    DWORD exitCode = 1;
    if (!GetExitCodeProcess(pi.hProcess, &exitCode))
        std::wcerr << L"\n[WARNING] Khong doc duoc exit code.\n";

    CloseHandle(pi.hProcess);
    CloseHandle(pi.hThread);

    std::wcout << L"\n[EXIT CODE] " << exitCode << L"\n";

    return static_cast<int>(exitCode);
}

// ============================================================
// Chay C
// ============================================================

void runC(const fs::path& source)
{
    fs::path tempDir;

    try
    {
        tempDir = createTempDirectory(L"code_runner_c_");
    }
    catch (...)
    {
        std::wcout << L"\n[ERROR] Khong tao duoc file tam cho C.\n";
        return;
    }

    // RAII: tu dong xoa EXE + thu muc tam khi ham ket thuc.
    TempCleanupGuard cleanupDir(tempDir, true);

    fs::path exePath = tempDir / L"program.exe";

    std::wcout << L"\n[1/2] Dang compile C...\n";
    std::wcout << L"      " << source.wstring() << L"\n";

    std::wstring gcc = getCompilerPath(L"gcc.exe");
    std::wstring compileCommand =
        gcc + L" -std=c17 -O2 -static -static-libgcc \"" +
        source.wstring() + L"\" -o \"" +
        exePath.wstring() + L"\"";

    int result = runCommand(compileCommand, fs::path(), false);

    if (result != 0)
    {
        std::wcout << L"\n[ERROR] Compile C that bai!\n";
        return;
    }

    std::wcout << L"\n[OK] Compile thanh cong.\n";
    std::wcout << L"[2/2] Dang chay...\n";
    std::wcout << L"--------------------------------------------\n";

    ctrlCPressed = 0;
    int runResult = runExecutable(
        exePath,
        source.parent_path()
    );

    if (runResult == 0)
    {
        std::wcout << L"\n[FINISHED] Chuong trinh da ket thuc binh thuong.\n";
    }
    else
    {
        std::wcout << L"\n[CRASH/ERROR] Chuong trinh ket thuc voi ma: "
                   << runResult << L"\n";
        if (static_cast<unsigned int>(runResult) == 0xC0000005u)
        {
            std::wcout << L"[WINDOWS] 0xC0000005 = Access Violation trong process con.\n";
            std::wcout << L"[INFO] Day khong phai thong bao 'het RAM'.\n";
        }
    }

    std::wcout << L"\n--------------------------------------------\n";

    if (ctrlCPressed)
        std::wcout << L"[CTRL+C] Da dung chuong trinh.\n";
}

// ============================================================
// Chay C++
// ============================================================

void runCpp(const fs::path& source)
{
    fs::path tempDir;

    try
    {
        tempDir = createTempDirectory(L"code_runner_cpp_");
    }
    catch (...)
    {
        std::wcout << L"\n[ERROR] Khong tao duoc file tam cho C++.\n";
        return;
    }

    // RAII: tu dong xoa EXE + thu muc tam khi ham ket thuc.
    TempCleanupGuard cleanupDir(tempDir, true);

    fs::path exePath = tempDir / L"program.exe";

    std::wcout << L"\n[1/2] Dang compile C++...\n";
    std::wcout << L"      " << source.wstring() << L"\n";

    std::wstring gpp = getCompilerPath(L"g++.exe");
    std::wstring compileCommand =
        gpp + L" -std=c++17 -O2 -static -static-libgcc -static-libstdc++ \"" +
        source.wstring() + L"\" -o \"" +
        exePath.wstring() + L"\"";

    int result = runCommand(compileCommand, fs::path(), false);

    if (result != 0)
    {
        std::wcout << L"\n[ERROR] Compile C++ that bai!\n";
        return;
    }

    std::wcout << L"\n[OK] Compile thanh cong.\n";
    std::wcout << L"[2/2] Dang chay...\n";
    std::wcout << L"--------------------------------------------\n";

    ctrlCPressed = 0;
    int runResult = runExecutable(
        exePath,
        source.parent_path()
    );

    if (runResult == 0)
    {
        std::wcout << L"\n[FINISHED] Chuong trinh da ket thuc binh thuong.\n";
    }
    else
    {
        std::wcout << L"\n[CRASH/ERROR] Chuong trinh ket thuc voi ma: "
                   << runResult << L"\n";
        if (static_cast<unsigned int>(runResult) == 0xC0000005u)
        {
            std::wcout << L"[WINDOWS] 0xC0000005 = Access Violation trong process con.\n";
            std::wcout << L"[INFO] Day khong phai thong bao 'het RAM'.\n";
        }
    }

    std::wcout << L"\n--------------------------------------------\n";

    if (ctrlCPressed)
        std::wcout << L"[CTRL+C] Da dung chuong trinh.\n";
}

// ============================================================
// Chay Python
// ============================================================

void runPython(const fs::path& source)
{
    std::wcout << L"\n[RUN] Dang chay Python...\n";
    std::wcout << L"--------------------------------------------\n";

    ctrlCPressed = 0;

    // -B ngan Python tao __pycache__ / .pyc trong thu muc source.
    runCommand(L"python -B \"" + source.wstring() + L"\"");

    std::wcout << L"\n--------------------------------------------\n";
    if (ctrlCPressed)
        std::wcout << L"[CTRL+C] Da dung Python.\n";
    else
        std::wcout << L"[FINISHED] Python da ket thuc.\n";
}

// ============================================================
// Chay Java
// ============================================================

void runJava(const fs::path& source)
{
    fs::path tempDir;

    try
    {
        tempDir = createTempDirectory(L"code_runner_java_");
    }
    catch (...)
    {
        std::wcout << L"\n[ERROR] Khong tao duoc thu muc tam cho Java.\n";
        return;
    }

    // Tat ca .class sinh ra boi javac nam trong tempDir.
    // RAII se xoa toan bo tempDir khi ham ket thuc.
    TempCleanupGuard cleanupDir(tempDir, true);

    std::wstring fileName = source.stem().wstring();

    std::wcout << L"\n[1/2] Dang compile Java...\n";

    std::wstring compileCommand =
        L"javac -d \"" + tempDir.wstring() +
        L"\" \"" + source.wstring() + L"\"";

    int result = runCommand(compileCommand);

    if (result != 0)
    {
        std::wcout << L"\n[ERROR] Compile Java that bai!\n";
        return;
    }

    std::wcout << L"\n[OK] Compile thanh cong.\n";
    std::wcout << L"[2/2] Dang chay...\n";
    std::wcout << L"--------------------------------------------\n";

    ctrlCPressed = 0;

    int runResult = runCommand(
        L"cmd /c cd /d \"" + tempDir.wstring() +
        L"\" && java -cp \"" + tempDir.wstring() +
        L"\" " + fileName,
        fs::path(),
        true
    );

    std::wcout << L"\n--------------------------------------------\n";

    if (ctrlCPressed)
        std::wcout << L"[CTRL+C] Da dung Java.\n";
    else if (runResult == 0)
        std::wcout << L"[FINISHED] Java da ket thuc binh thuong.\n";
    else
        std::wcout << L"[ERROR] Java ket thuc voi ma: " << runResult << L"\n";
}

// ============================================================
// MAIN
// ============================================================

int main()
{
    SetConsoleOutputCP(CP_UTF8);
    SetConsoleCP(CP_UTF8);
    SetConsoleTitleW(L"Code Quick Runner");
    signal(SIGINT, handleCtrlC);

    while (true)
    {
        showMenu();

        std::wcout << L"Chon ngon ngu: ";
        std::wcout.flush();

        std::wstring choice;
        std::getline(std::wcin, choice);
        choice = trim(choice);

        if (choice == L"0" || choice == L"exit" || choice == L"EXIT")
            break;

        if (choice != L"1" && choice != L"2" &&
            choice != L"3" && choice != L"4")
        {
            std::wcout << L"\n[ERROR] Lua chon khong hop le!\n";
            continue;
        }

        std::wstring language;
        if (choice == L"1")      language = L"C";
        else if (choice == L"2") language = L"C++";
        else if (choice == L"3") language = L"Python";
        else                     language = L"Java";

        std::wcout << L"\n============================================\n";
        std::wcout << L"Ngon ngu: " << language << L"\n";
        std::wcout << L"Paste duong dan file code:\n";
        std::wcout << language << L" > ";

        std::wstring inputPath;
        std::getline(std::wcin, inputPath);
        inputPath = removeQuotes(inputPath);

        if (inputPath.empty()) continue;
        if (inputPath == L"exit" || inputPath == L"EXIT") break;

        fs::path source(inputPath);

        if (!fs::exists(source))
        {
            std::wcout << L"\n[ERROR] Khong tim thay file:\n";
            std::wcout << source.wstring() << L"\n";
            continue;
        }

        if (!fs::is_regular_file(source))
        {
            std::wcout << L"\n[ERROR] Duong dan khong phai file.\n";
            continue;
        }

        std::wstring extension = source.extension().wstring();
        std::transform(extension.begin(), extension.end(),
                       extension.begin(), ::towlower);

        if (choice == L"1" && extension != L".c")
        { std::wcout << L"\n[ERROR] C can file .c\n"; continue; }

        if (choice == L"2" && extension != L".cpp" &&
            extension != L".cc" && extension != L".cxx")
        { std::wcout << L"\n[ERROR] C++ can file .cpp / .cc / .cxx\n"; continue; }

        if (choice == L"3" && extension != L".py")
        { std::wcout << L"\n[ERROR] Python can file .py\n"; continue; }

        if (choice == L"4" && extension != L".java")
        { std::wcout << L"\n[ERROR] Java can file .java\n"; continue; }

        if (choice == L"1")      runC(source);
        else if (choice == L"2") runCpp(source);
        else if (choice == L"3") runPython(source);
        else if (choice == L"4") runJava(source);
    }

    std::wcout << L"\nThoat Code Quick Runner.\n";
    return 0;
}
