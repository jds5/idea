"""Local QEMU diagnostics and lossless framebuffer capture (not Windows UI)."""
import argparse
import json
import socket
import time

p = argparse.ArgumentParser()
p.add_argument('command', choices=['status', 'screenshot', 'key', 'click', 'drag', 'move', 'text'])
p.add_argument('value', nargs='?')
p.add_argument('--port', type=int, default=5906)
p.add_argument('--width', type=int, default=1280)
p.add_argument('--height', type=int, default=800)
args = p.parse_args()
with socket.create_connection(('127.0.0.1', args.port), timeout=10) as sock:
    stream = sock.makefile('rwb')
    greeting = json.loads(stream.readline())

    def execute(command, arguments=None):
        request = {'execute': command}
        if arguments is not None:
            request['arguments'] = arguments
        stream.write(json.dumps(request).encode() + b'\n')
        stream.flush()
        while True:
            result = json.loads(stream.readline())
            if 'error' in result:
                raise RuntimeError(result['error'])
            if 'return' in result:
                return result['return']

    execute('qmp_capabilities')
    if args.command == 'status':
        print(json.dumps(execute('query-status')))
        print(json.dumps(execute('query-kvm')))
    elif args.command == 'screenshot':
        if not args.value:
            p.error('screenshot requires an absolute guest-container .ppm path')
        print(execute('screendump', {'filename': args.value}))
    elif args.command == 'key':
        if not args.value:
            p.error('key requires a QEMU qcode')
        print(execute('send-key', {'keys': [{'type': 'qcode', 'data': key} for key in args.value.split('+')]}))
        time.sleep(0.5)
    elif args.command == 'text':
        plain = {' ': 'spc', '-': 'minus', '.': 'dot', '/': 'slash', '=': 'equal',
                 '\\': 'backslash', ';': 'semicolon', "'": 'apostrophe', ',': 'comma',
                 '[': 'bracket_left', ']': 'bracket_right', '`': 'grave_accent'}
        shifted = {'_': 'minus', ':': 'semicolon', '"': 'apostrophe', '+': 'equal',
                   '(': '9', ')': '0', '>': 'dot', '<': 'comma', '|': 'backslash',
                   '$': '4', '!': '1', '?': 'slash', '&': '7', '~': 'grave_accent'}
        if args.value is None or any(not (char.isascii() and char.isalnum())
                                     and char not in plain and char not in shifted
                                     for char in args.value):
            p.error('text requires supported ASCII characters; no input was sent')
        for char in args.value:
            shift = char.isupper() or char in shifted
            code = shifted.get(char, plain.get(char, char.lower()))
            keys = ([{'type': 'qcode', 'data': 'shift'}] if shift else [])
            keys.append({'type': 'qcode', 'data': code})
            execute('send-key', {'keys': keys, 'hold-time': 30})
            time.sleep(0.05)
        time.sleep(0.5)
    elif args.command in ('click', 'drag', 'move'):
        if not args.value:
            p.error('mouse input requires coordinates')
        points = list(map(int, args.value.split(',')))
        if len(points) != (4 if args.command == 'drag' else 2):
            p.error('click requires x,y; drag requires x1,y1,x2,y2')
        x, y = points[:2]
        assert 0 <= x < args.width and 0 <= y < args.height
        if args.command == 'drag':
            end_x, end_y = points[2:]
            assert 0 <= end_x < args.width and 0 <= end_y < args.height
        events = [
            {'type': 'abs', 'data': {'axis': 'x', 'value': round(x * 32767 / (args.width - 1))}},
            {'type': 'abs', 'data': {'axis': 'y', 'value': round(y * 32767 / (args.height - 1))}}]
        if args.command != 'move':
            events.append({'type': 'btn', 'data': {'button': 'left', 'down': True}})
        execute('input-send-event', {'events': events})
        if args.command == 'drag':
            for step in range(1, 21):
                next_x = x + (end_x - x) * step / 20
                next_y = y + (end_y - y) * step / 20
                execute('input-send-event', {'events': [
                    {'type': 'abs', 'data': {'axis': 'x', 'value': round(next_x * 32767 / (args.width - 1))}},
                    {'type': 'abs', 'data': {'axis': 'y', 'value': round(next_y * 32767 / (args.height - 1))}}]})
                time.sleep(0.03)
        if args.command != 'move':
            print(execute('input-send-event', {'events': [
                {'type': 'btn', 'data': {'button': 'left', 'down': False}}]}))
        time.sleep(0.5)
