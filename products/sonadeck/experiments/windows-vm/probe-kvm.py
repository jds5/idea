"""Exercise KVM with one real-mode HLT instruction; no guest OS or disk."""
import ctypes
import fcntl
import mmap
import os
import struct


def main():
    with open('/dev/kvm', 'r+b', buffering=0) as kvm:
        api = fcntl.ioctl(kvm, 0xAE00, 0)
        print(f'KVM_API_VERSION: {api}', flush=True)
        assert api == 12
        vm = fcntl.ioctl(kvm, 0xAE01, 0)
        print('KVM_CREATE_VM: OK', flush=True)
        memory = mmap.mmap(-1, 4096)
        memory[0] = 0xF4  # HLT in real mode
        address = ctypes.addressof(ctypes.c_char.from_buffer(memory))
        region = struct.pack('<IIQQQ', 0, 0, 0, 4096, address)
        fcntl.ioctl(vm, 0x4020AE46, region)
        cpu = fcntl.ioctl(vm, 0xAE41, 0)
        print('KVM_CREATE_VCPU: OK', flush=True)
        sregs = bytearray(312)
        fcntl.ioctl(cpu, 0x8138AE83, sregs)
        struct.pack_into('<Q', sregs, 0, 0)  # CS.base
        struct.pack_into('<H', sregs, 12, 0)  # CS.selector
        fcntl.ioctl(cpu, 0x4138AE84, sregs)
        regs = bytearray(144)
        struct.pack_into('<Q', regs, 17 * 8, 2)  # RFLAGS
        fcntl.ioctl(cpu, 0x4090AE82, regs)
        size = fcntl.ioctl(kvm, 0xAE04, 0)
        state = mmap.mmap(cpu, size, flags=mmap.MAP_SHARED,
                          prot=mmap.PROT_READ | mmap.PROT_WRITE)
        fcntl.ioctl(cpu, 0xAE80, 0)
        reason = struct.unpack_from('<I', state, 8)[0]
        print(f'KVM_RUN exit_reason: {reason} (expected 5 = HLT)', flush=True)
        assert reason == 5, f'Unexpected guest exit: {reason}'
        print('PASS: guest executed HLT using nested KVM; macOS boot NOT tested.', flush=True)
        state.close()
        os.close(cpu)
        os.close(vm)
        memory.close()


if __name__ == '__main__':
    main()
