
### STORE UTIL
This project created to help developers to store their programming(not only) notes.

### Installation


```
npm install -g
```

First of all, you have to create github repository where you will store notes
in the markdown format. An example of such repository: [https://github.com/uncle-T0ny/stock2](https://github.com/uncle-T0ny/stock2)

The **.md** notes file should store notes in the next format:
a start note begins from "\[tags\]: <>" then declare the tags in
figure braces "(tag, tag 2, etc..)"
```
[tags]: <> (sql, mysql, column description) Select all columns description by type
```

```
the main note
```

and ends with "close note" tag
```
[tags-end]: <>
```


### TODO

1. Adapt the Store_util for windows users