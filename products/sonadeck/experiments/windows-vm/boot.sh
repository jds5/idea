#!/usr/bin/env bash
set -euo pipefail
cd /lab
test -f BaseSystem.verified.dmg
if [[ ! -f BaseSystem.img ]]; then
  qemu-img convert -f dmg -O raw BaseSystem.verified.dmg BaseSystem.img
fi
if [[ ! -f sonadeck-test.qcow2 ]]; then
  qemu-img create -f qcow2 sonadeck-test.qcow2 120G
fi
exec qemu-system-x86_64 \
  -name sonadeck-macos-lab -enable-kvm -machine q35 -m 8192 \
  -cpu Skylake-Client,vendor=GenuineIntel,+invtsc,-hle,-rtm \
  -smp 6,cores=6,sockets=1 \
  -device qemu-xhci,id=xhci \
  -device usb-kbd,bus=xhci.0 -device usb-tablet,bus=xhci.0 \
  -device 'isa-applesmc,osk=ourhardworkbythesewordsguardedpleasedontsteal(c)AppleComputerInc' \
  -drive if=pflash,format=raw,readonly=on,file=OVMF_CODE_4M.fd \
  -drive if=pflash,format=raw,file=OVMF_VARS-1920x1080.fd \
  -smbios type=2 \
  -audiodev none,id=audio0 -device ich9-intel-hda -device hda-duplex,audiodev=audio0 \
  -device ich9-ahci,id=sata \
  -drive id=OpenCoreBoot,if=none,snapshot=on,format=qcow2,file=OpenCore.qcow2 \
  -device ide-hd,bus=sata.2,drive=OpenCoreBoot \
  -drive id=InstallMedia,if=none,format=raw,file=BaseSystem.img \
  -device ide-hd,bus=sata.3,drive=InstallMedia \
  -drive id=MacHDD,if=none,format=qcow2,file=sonadeck-test.qcow2 \
  -device ide-hd,bus=sata.4,drive=MacHDD \
  -netdev user,id=net0 -device virtio-net-pci,netdev=net0 \
  -device vmware-svga -display none -vnc 0.0.0.0:0 \
  -qmp tcp:0.0.0.0:4444,server=on,wait=off -monitor none \
  -serial file:/lab/serial.log
