
### STORE UTIL
This project created to help developers to store their programming(not only) notes.

### Installation

In the terminal execute the following command:


```
npm i -g store_util
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

### Usage

1. In the terminal execute the following command to open util:

```
sut
```

2. The util will ask github repository, type your own or https://github.com/uncle-T0ny/stock2

3. Then you can user util typing with searching notes typing tag names

4. You can update the cached repository from github executing
```
sut --update
```

5. You also can find required note just adding searching tag to the util parameter
```
sut sql
```


### TODO

1. Adapt the Store_util for windows users