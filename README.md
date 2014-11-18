oyayubi-server
==============
## Dependencies

1. install vips (reference: https://github.com/lovell/sharp)
```
curl -s https://raw.githubusercontent.com/lovell/sharp/master/preinstall.sh | bash -
```

## image thumbnail server

get square thumbnail of http://image-host.com/img.jpg to 20x20
```
http://oyayubi-server-host.com?url=http://image-host.com/img.jpg&dim=20x20
```
